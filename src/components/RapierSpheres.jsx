import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// 3D 物理引擎求解器：复刻无重力向心吸引力场与高线性阻力
class Physics3D {
  constructor(config) {
    this.config = config;
    this.positionData = new Float32Array(3 * config.count).fill(0);
    this.velocityData = new Float32Array(3 * config.count).fill(0);
    this.sizeData = new Float32Array(config.count).fill(1);
    this.center = new THREE.Vector3(); // 鼠标物理交互中心
    this.reset();
  }

  reset() {
    const { config, positionData, velocityData, sizeData } = this;
    for (let i = 0; i < config.count; i++) {
      const base = 3 * i;
      // 官方初始位置：THREE.MathUtils.randFloatSpread(10)
      positionData[base] = THREE.MathUtils.randFloatSpread(10);
      positionData[base + 1] = THREE.MathUtils.randFloatSpread(10);
      positionData[base + 2] = THREE.MathUtils.randFloatSpread(10);

      // 初速度归零
      velocityData[base] = 0;
      velocityData[base + 1] = 0;
      velocityData[base + 2] = 0;

      // 尺寸：默认 1.0 (按配置缩放)
      sizeData[i] = THREE.MathUtils.randFloat(config.minSize, config.maxSize);
    }
  }

  setSizes() {
    const { config, sizeData } = this;
    for (let i = 0; i < config.count; i++) {
      sizeData[i] = THREE.MathUtils.randFloat(config.minSize, config.maxSize);
    }
  }

  update(delta) {
    const { config, center, positionData, sizeData, velocityData } = this;
    const dt = Math.min(delta, 0.1); // 官方限制 dt = Math.min(0.1, delta)

    // 1. 物理受力更新 (向心吸引力 + 阻力)
    for (let idx = 0; idx < config.count; idx++) {
      const base = 3 * idx;
      const px = positionData[base];
      const py = positionData[base + 1];
      const pz = positionData[base + 2];

      // 官方吸引力算法：vec.copy(translation).negate().multiplyScalar(0.2)
      // 施加指向原点 [0,0,0] 的引力冲量
      const pullStrength = config.gravity * 0.18; // 重力系数作为引力强度
      velocityData[base] += -px * pullStrength;
      velocityData[base + 1] += -py * pullStrength;
      velocityData[base + 2] += -pz * pullStrength;

      // 官方阻力系数：linearDamping={4}
      // 速度按 damping 指数衰减
      const damp = Math.exp(-4.0 * dt);
      velocityData[base] *= damp;
      velocityData[base + 1] *= damp;
      velocityData[base + 2] *= damp;

      // 限速
      const vx = velocityData[base];
      const vy = velocityData[base + 1];
      const vz = velocityData[base + 2];
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (speed > config.maxVelocity) {
        const scale = config.maxVelocity / speed;
        velocityData[base] *= scale;
        velocityData[base + 1] *= scale;
        velocityData[base + 2] *= scale;
      }

      // 位置更新
      positionData[base] += velocityData[base] * dt * 60;
      positionData[base + 1] += velocityData[base + 1] * dt * 60;
      positionData[base + 2] += velocityData[base + 2] * dt * 60;
    }

    // 2. 球与球弹性碰撞解算 (Rapier 碰撞模型仿制)
    const iterations = 3;
    for (let iter = 0; iter < iterations; iter++) {
      for (let idx = 0; idx < config.count; idx++) {
        const base = 3 * idx;
        const r1 = sizeData[idx];
        const px1 = positionData[base];
        const py1 = positionData[base + 1];
        const pz1 = positionData[base + 2];

        let vx1 = velocityData[base];
        let vy1 = velocityData[base + 1];
        let vz1 = velocityData[base + 2];

        for (let jdx = idx + 1; jdx < config.count; jdx++) {
          const otherBase = 3 * jdx;
          const r2 = sizeData[jdx];
          const px2 = positionData[otherBase];
          const py2 = positionData[otherBase + 1];
          const pz2 = positionData[otherBase + 2];

          const dx = px2 - px1;
          const dy = py2 - py1;
          const dz = pz2 - pz1;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const minDist = r1 + r2;

          if (dist < minDist && dist > 0.0001) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;

            // 轻微排斥分离
            const m1 = r1;
            const m2 = r2;
            const totalMass = m1 + m2;
            const ratio1 = m2 / totalMass;
            const ratio2 = m1 / totalMass;

            positionData[base] -= nx * overlap * ratio1 * 0.95;
            positionData[base + 1] -= ny * overlap * ratio1 * 0.95;
            positionData[base + 2] -= nz * overlap * ratio1 * 0.95;

            positionData[otherBase] += nx * overlap * ratio2 * 0.95;
            positionData[otherBase + 1] += ny * overlap * ratio2 * 0.95;
            positionData[otherBase + 2] += nz * overlap * ratio2 * 0.95;

            // 速度碰撞反应 (Rapier friction=0.1)
            const vx2 = velocityData[otherBase];
            const vy2 = velocityData[otherBase + 1];
            const vz2 = velocityData[otherBase + 2];

            const rvx = vx2 - vx1;
            const rvy = vy2 - vy1;
            const rvz = vz2 - vz1;
            const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

            if (velAlongNormal < 0) {
              const restitution = config.wallBounce;
              const impulseScalar = -(1 + restitution) * velAlongNormal / (1/m1 + 1/m2);

              const ix = impulseScalar * nx;
              const iy = impulseScalar * ny;
              const iz = impulseScalar * nz;

              vx1 -= ix / m1;
              vy1 -= iy / m1;
              vz1 -= iz / m1;

              velocityData[otherBase] += ix / m2;
              velocityData[otherBase + 1] += iy / m2;
              velocityData[otherBase + 2] += iz / m2;
            }
          }
        }

        velocityData[base] = vx1;
        velocityData[base + 1] = vy1;
        velocityData[base + 2] = vz1;
      }
    }

    // 3. 鼠标交互排斥力 (对齐官方 kinematic 指针碰撞)
    if (config.controlSphere0) {
      const mouseRadius = config.mouseRadius || 1.0;
      for (let idx = 0; idx < config.count; idx++) {
        const base = 3 * idx;
        const r = sizeData[idx];
        const px = positionData[base];
        const py = positionData[base + 1];
        const pz = positionData[base + 2];

        const dx = px - center.x;
        const dy = py - center.y;
        const dz = pz - center.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = r + mouseRadius;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // 强制推开
          positionData[base] += nx * overlap * 0.95;
          positionData[base + 1] += ny * overlap * 0.95;
          positionData[base + 2] += nz * overlap * 0.95;

          // 施加排斥冲量速度
          velocityData[base] += nx * overlap * 5 * 60 * dt;
          velocityData[base + 1] += ny * overlap * 5 * 60 * dt;
          velocityData[base + 2] += nz * overlap * 5 * 60 * dt;
        }
      }
    }

    // 4. 外围缓和边界 (防止球散失到无限远)
    const maxBound = Math.max(config.maxX * 2.5, 18);
    for (let idx = 0; idx < config.count; idx++) {
      const base = 3 * idx;
      const px = positionData[base];
      const py = positionData[base + 1];
      const pz = positionData[base + 2];
      
      const dist = Math.sqrt(px*px + py*py + pz*pz);
      if (dist > maxBound) {
        positionData[base] *= 0.9;
        positionData[base + 1] *= 0.9;
        positionData[base + 2] *= 0.9;
        velocityData[base] *= -0.2;
        velocityData[base + 1] *= -0.2;
        velocityData[base + 2] *= -0.2;
      }
    }
  }
}

// 默认配置项 (对齐官方)
const DEFAULT_CONFIG = {
  count: 45, // 官方预设大概 30-50 个球体最佳
  colors: ['#ff4060', '#ffcc00', '#20ffa0', '#4060ff'],
  minSize: 1.0,
  maxSize: 1.0,
  gravity: 1.0,      // 引力强度乘数
  friction: 0.98,
  wallBounce: 0.1,    // 官方物理碰撞偏软且低弹性
  maxVelocity: 0.35,
  maxX: 10,
  maxY: 10,
  maxZ: 10,
  minY: 5.0,
  controlSphere0: false,
  mouseRadius: 1.6,
  followCursor: true,
  lightIntensity: 300
};

// 官方 28 种精细材质预设分配
const getMaterialPreset = (idx, accentColor) => {
  const presets = [
    { color: '#444444', roughness: 0.1, metalness: 0.5 },
    { color: '#444444', roughness: 0.1, metalness: 0.5 },
    { color: '#444444', roughness: 0.1, metalness: 0.5 },
    { color: '#ffffff', roughness: 0.1, metalness: 0.1 },
    { color: '#ffffff', roughness: 0.1, metalness: 0.1 },
    { color: '#ffffff', roughness: 0.1, metalness: 0.1 },
    { color: accentColor, roughness: 0.1, metalness: 0.1 },
    { color: accentColor, roughness: 0.1, metalness: 0.1 },
    { color: accentColor, roughness: 0.1, metalness: 0.1 },
    { color: '#444444', roughness: 0.1, metalness: 0.0 },
    { color: '#444444', roughness: 0.3, metalness: 0.0 },
    { color: '#444444', roughness: 0.3, metalness: 0.0 },
    { color: '#ffffff', roughness: 0.1, metalness: 0.0 },
    { color: '#ffffff', roughness: 0.2, metalness: 0.0 },
    { color: '#ffffff', roughness: 0.1, metalness: 0.0 },
    { color: accentColor, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.5 },
    { color: accentColor, roughness: 0.3, metalness: 0.0 },
    { color: accentColor, roughness: 0.1, metalness: 0.0 }
  ];
  return presets[idx % presets.length];
};

function createRapierSpheres(canvas, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // 创建 ThreeJS 核心渲染环境
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141622); // 官方背景色 #141622

  // 官方长焦视角配置：fov: 17.5, position: [0, 0, 30]
  const camera = new THREE.PerspectiveCamera(17.5, canvas.clientWidth / canvas.clientHeight, 10, 40);
  camera.position.set(0, 0, 30);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    powerPreference: 'high-performance',
    antialias: false, // 官方 gl={{ antialias: false }} 并搭配 FXAA
    alpha: false
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // 官方 dpr={[1, 1.5]}
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // ==================== 重点复刻：环境光形反射器 (Lightformers) ====================
  // 在辅助场景中生成官方的自发光 Plane/Ring 并渲染出立方体映射贴图 (Cubemap)，
  // 这能够在球体的镜面上打亮出标志性的“白色和蓝色光环与圆点”
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x141622);

  const envGroup = new THREE.Group();
  envGroup.rotation.set(-Math.PI / 3, 0, 1); // 官方旋转：rotation={[-Math.PI / 3, 0, 1]}

  const geomCircle = new THREE.RingGeometry(0, 1, 32);
  const geomRing = new THREE.RingGeometry(0.85, 1, 32);

  // 1. Circle, intensity 100, rotation-x={Math.PI / 2}, position [0, 5, -9], scale 2
  const matC1 = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  matC1.color.multiplyScalar(65); // 强白光
  const c1 = new THREE.Mesh(geomCircle, matC1);
  c1.position.set(0, 5, -9);
  c1.scale.set(2, 2, 2);
  c1.rotateX(Math.PI / 2);
  envGroup.add(c1);

  // 2. Ring, color #4060ff, intensity 80, position [10, 10, 0], scale 10
  const matR1 = new THREE.MeshBasicMaterial({ color: 0x4060ff, side: THREE.DoubleSide });
  matR1.color.multiplyScalar(50); // 蓝色光环
  const r1 = new THREE.Mesh(geomRing, matR1);
  r1.position.set(10, 10, 0);
  r1.scale.set(10, 10, 10);
  r1.onUpdate = (self) => self.lookAt(0, 0, 0);
  envGroup.add(r1);

  // 3. Circle, intensity 2, rotation-y={Math.PI / 2}, position [-5, 1, -1], scale 2
  const matC2 = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  matC2.color.multiplyScalar(2.0);
  const c2 = new THREE.Mesh(geomCircle, matC2);
  c2.position.set(-5, 1, -1);
  c2.scale.set(2, 2, 2);
  c2.rotateY(Math.PI / 2);
  envGroup.add(c2);

  // 4. Circle, intensity 2, rotation-y={Math.PI / 2}, position [-5, -1, -1], scale 2
  const c3 = new THREE.Mesh(geomCircle, matC2);
  c3.position.set(-5, -1, -1);
  c3.scale.set(2, 2, 2);
  c3.rotateY(Math.PI / 2);
  envGroup.add(c3);

  // 5. Circle, intensity 2, rotation-y={-Math.PI / 2}, position [10, 1, 0], scale 8
  const c4 = new THREE.Mesh(geomCircle, matC2);
  c4.position.set(10, 1, 0);
  c4.scale.set(8, 8, 8);
  c4.rotateY(-Math.PI / 2);
  envGroup.add(c4);

  envScene.add(envGroup);

  // 一次性渲染出立方体纹理，避免运行时每帧渲染 CubeCamera 的性能消耗
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
  });
  const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
  cubeCamera.update(renderer, envScene);

  // 将烘焙出的 Cubemap 作为场景的环境光照和反射贴图
  scene.environment = cubeRenderTarget.texture;

  // 6. 三维球体几何体与材质生成
  const sphereGeo = new THREE.SphereGeometry(1, 48, 48); // 官方 args={[1, 64, 64]}，在此用 48 确保移动端高性能

  const physics = new Physics3D(config);
  const meshes = [];

  function initSpheres() {
    // 清理老旧资源
    meshes.forEach(m => {
      scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    meshes.length = 0;

    physics.reset();

    for (let i = 0; i < config.count; i++) {
      // 提取色彩主题的颜色作为高亮主色
      const accentColor = config.colors[i % config.colors.length];
      const preset = getMaterialPreset(i, accentColor);

      // 完全复刻官方 meshStandardMaterial
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(preset.color),
        roughness: preset.roughness,
        metalness: preset.metalness !== undefined ? preset.metalness : 0.0,
        transparent: preset.transparent !== undefined ? preset.transparent : false,
        opacity: preset.opacity !== undefined ? preset.opacity : 1.0,
        envMapIntensity: 1.5
      });

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshes.push(mesh);
    }
  }

  initSpheres();

  // 7. 光源补充 (Lights)
  const ambientLight = new THREE.AmbientLight(0x141622, 0.4); // 极弱底色填充
  scene.add(ambientLight);

  // 强逆光与辅光来模拟 SSGI 色彩溢出
  const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
  dirLight.position.set(5, 5, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // 逆向顶光，辅助打亮边缘
  const backLight = new THREE.DirectionalLight(0xffffff, 1.5);
  backLight.position.set(-5, 5, -5);
  scene.add(backLight);

  // 鼠标排斥点光源
  const mouseLight = new THREE.PointLight(new THREE.Color(config.colors[0]), 10, 8, 1.2);
  scene.add(mouseLight);

  // 8. 官方后处理辉光流水线复刻 (Effects)
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 官方参数复刻：luminanceThreshold: 0.1, intensity: 0.9, mipmapBlur: true
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
    0.9,   // 辉光强度 (Intensity)
    0.9,   // 辉光半径 (Radius)
    0.1    // 辉光阈值 (Threshold)
  );
  composer.addPass(bloomPass);

  // 9. 鼠标与触控射线投射
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const rayIntersection = new THREE.Vector3();

  // 尺寸调整
  function handleResize() {
    const width = canvas.parentNode ? canvas.parentNode.offsetWidth : window.innerWidth;
    const height = canvas.parentNode ? canvas.parentNode.offsetHeight : window.innerHeight;
    
    camera.aspect = width / height;
    
    // 窄屏高度自适应
    if (camera.aspect < 1.0) {
      camera.fov = 17.5 / camera.aspect;
    } else {
      camera.fov = 17.5;
    }
    
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
    bloomPass.setSize(width, height);
  }
  
  window.addEventListener('resize', handleResize);
  handleResize();

  // 10. 动画循环
  const clock = new THREE.Clock();
  let animationId;
  let isPaused = false;

  function animate() {
    animationId = requestAnimationFrame(animate);

    if (isPaused) return;

    const delta = clock.getDelta();
    physics.update(delta);

    // 逐个更新球体 Mesh 的位置和大小
    for (let i = 0; i < config.count; i++) {
      const mesh = meshes[i];
      if (mesh) {
        mesh.position.fromArray(physics.positionData, 3 * i);
        mesh.scale.setScalar(physics.sizeData[i]);
      }
    }

    // 更新鼠标点光源
    if (config.controlSphere0 && config.followCursor) {
      mouseLight.position.copy(physics.center);
      mouseLight.intensity = config.lightIntensity / 30;
    } else {
      mouseLight.intensity = 0;
    }

    composer.render();
  }

  animate();

  // 鼠标交互输入接口
  const updateMousePosition = (nPos) => {
    raycaster.setFromCamera(nPos, camera);
    raycaster.ray.intersectPlane(interactionPlane, rayIntersection);
    physics.center.copy(rayIntersection);
    physics.center.z = THREE.MathUtils.clamp(physics.center.z, -config.maxZ, config.maxZ);
    config.controlSphere0 = true;
  };

  const clearMouse = () => {
    config.controlSphere0 = false;
  };

  return {
    updateMousePosition,
    clearMouse,
    reset() {
      physics.reset();
    },
    updateConfig(newConfig) {
      const countChanged = newConfig.count !== undefined && newConfig.count !== config.count;
      const colorsChanged = newConfig.colors !== undefined && JSON.stringify(newConfig.colors) !== JSON.stringify(config.colors);

      Object.assign(config, newConfig);
      Object.assign(physics.config, newConfig);

      if (countChanged || colorsChanged) {
        initSpheres();
      } else {
        if (newConfig.minSize !== undefined || newConfig.maxSize !== undefined) {
          physics.setSizes();
        }
      }
    },
    dispose() {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      
      // 深度清理显存
      scene.traverse(obj => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      
      cubeRenderTarget.dispose();
      composer.dispose();
      renderer.dispose();
    }
  };
}

const RapierSpheres = ({
  className = '',
  count = 45,
  colors = ['#ff4060', '#ffcc00', '#20ffa0', '#4060ff'],
  minSize = 1.0,
  maxSize = 1.0,
  gravity = 1.0,
  friction = 0.98,
  wallBounce = 0.1,
  lightIntensity = 300,
  followCursor = true,
  ...props
}) => {
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);

  // 绑定交互
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let controller;
    try {
      controller = createRapierSpheres(canvas, {
        count,
        colors,
        minSize,
        maxSize,
        gravity,
        friction,
        wallBounce,
        lightIntensity,
        followCursor,
        ...props
      });
      controllerRef.current = controller;
    } catch (err) {
      console.error("RapierSpheres Init Error: ", err);
      const errDiv = document.createElement('div');
      errDiv.id = 'webgl-error-display';
      errDiv.style.position = 'absolute';
      errDiv.style.top = '100px';
      errDiv.style.left = '20px';
      errDiv.style.background = 'rgba(255, 0, 0, 0.9)';
      errDiv.style.color = 'white';
      errDiv.style.padding = '20px';
      errDiv.style.borderRadius = '8px';
      errDiv.style.zIndex = '99999';
      errDiv.style.fontFamily = 'monospace';
      errDiv.style.fontSize = '14px';
      errDiv.style.maxWidth = '80%';
      errDiv.style.whiteSpace = 'pre-wrap';
      errDiv.style.wordBreak = 'break-all';
      errDiv.innerHTML = `<h3>WebGL Init Error:</h3><pre>${err.stack || err.message}</pre>`;
      document.body.appendChild(errDiv);
      return;
    }

    const normalizedPos = new THREE.Vector2();

    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      normalizedPos.x = (x / rect.width) * 2 - 1;
      normalizedPos.y = -(y / rect.height) * 2 + 1;
      controller.updateMousePosition(normalizedPos);
    };

    const handlePointerLeave = () => {
      controller.clearMouse();
    };

    const handleTouchStartMove = (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        normalizedPos.x = (x / rect.width) * 2 - 1;
        normalizedPos.y = -(y / rect.height) * 2 + 1;
        controller.updateMousePosition(normalizedPos);
      }
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('touchstart', handleTouchStartMove, { passive: true });
    canvas.addEventListener('touchmove', handleTouchStartMove, { passive: true });
    canvas.addEventListener('touchend', handlePointerLeave);

    canvas.style.touchAction = 'none';

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('touchstart', handleTouchStartMove);
      canvas.removeEventListener('touchmove', handleTouchStartMove);
      canvas.removeEventListener('touchend', handlePointerLeave);
      controller.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 更新配置
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.updateConfig({
        count,
        colors,
        minSize,
        maxSize,
        gravity,
        friction,
        wallBounce,
        lightIntensity,
        followCursor
      });
    }
  }, [
    count,
    colors,
    minSize,
    maxSize,
    gravity,
    friction,
    wallBounce,
    lightIntensity,
    followCursor
  ]);

  return <canvas className={`${className} w-full h-full`} ref={canvasRef} />;
};

export default RapierSpheres;
