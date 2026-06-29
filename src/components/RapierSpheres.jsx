import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// 3D 物理引擎求解器
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
      // 在高处随机分布生成，让它们下落碰撞
      positionData[base] = THREE.MathUtils.randFloatSpread(config.maxX * 1.2);
      positionData[base + 1] = THREE.MathUtils.randFloat(config.minY, config.maxY);
      positionData[base + 2] = THREE.MathUtils.randFloatSpread(config.maxZ * 1.2);

      // 初速度归零
      velocityData[base] = 0;
      velocityData[base + 1] = 0;
      velocityData[base + 2] = 0;

      // 尺寸随机
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
    const dt = Math.min(delta, 0.03); // 限制单帧最大步长，防穿墙

    // 1. 施加重力和摩擦力，更新位置
    for (let idx = 0; idx < config.count; idx++) {
      const base = 3 * idx;

      // 重力加速度 Y 轴向下
      velocityData[base + 1] -= dt * config.gravity * 25;

      // 摩擦力衰减
      velocityData[base] *= config.friction;
      velocityData[base + 1] *= config.friction;
      velocityData[base + 2] *= config.friction;

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

    // 2. 球与球物理碰撞解算（进行多次迭代以保证物理叠放稳定性）
    const iterations = 4;
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
            // 归一化碰撞法线
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;

            // 弹性排斥分离（基于质量比例分配）
            const m1 = r1; // 用半径模拟质量
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

            // 速度弹性动量解算
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

    // 3. 鼠标交互排斥力
    if (config.controlSphere0) {
      const mouseRadius = config.mouseRadius || 2.2;
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

          // 平滑推开
          positionData[base] += nx * overlap * 0.7;
          positionData[base + 1] += ny * overlap * 0.7;
          positionData[base + 2] += nz * overlap * 0.7;

          // 施加推力速度
          velocityData[base] += nx * overlap * 0.2 * 60;
          velocityData[base + 1] += ny * overlap * 0.2 * 60;
          velocityData[base + 2] += nz * overlap * 0.2 * 60;
        }
      }
    }

    // 4. 边界（箱体）碰撞约束，限制其集中在中心形成堆叠堆
    for (let idx = 0; idx < config.count; idx++) {
      const base = 3 * idx;
      const r = sizeData[idx];

      let px = positionData[base];
      let py = positionData[base + 1];
      let pz = positionData[base + 2];

      let vx = velocityData[base];
      let vy = velocityData[base + 1];
      let vz = velocityData[base + 2];

      // 地板 (Y 轴下界)
      if (py - r < -config.floorY) {
        py = -config.floorY + r;
        vy = -vy * config.wallBounce;
        // 地板摩擦阻力
        vx *= config.friction;
        vz *= config.friction;
      }

      // 天花板 (Y 轴上界)
      if (py + r > config.maxY * 1.6) {
        py = config.maxY * 1.6 - r;
        vy = -vy * config.wallBounce;
      }

      // 左右侧壁 (X 轴边界，范围略微收窄以让球堆积在屏幕中间)
      if (Math.abs(px) + r > config.maxX) {
        px = Math.sign(px) * (config.maxX - r);
        vx = -vx * config.wallBounce;
      }

      // 前后壁面 (Z 轴边界，让球前后挤压出纵深感)
      if (Math.abs(pz) + r > config.maxZ) {
        pz = Math.sign(pz) * (config.maxZ - r);
        vz = -vz * config.wallBounce;
      }

      positionData[base] = px;
      positionData[base + 1] = py;
      positionData[base + 2] = pz;

      velocityData[base] = vx;
      velocityData[base + 1] = vy;
      velocityData[base + 2] = vz;
    }
  }
}

// 默认配置项 (针对参考图视觉微调)
const DEFAULT_CONFIG = {
  count: 80,
  colors: ['#7f00ff', '#ffffff', '#1e293b'],
  minSize: 0.5,
  maxSize: 1.0,
  gravity: 0.9,
  friction: 0.99,
  wallBounce: 0.7,
  maxVelocity: 0.25,
  maxX: 4.2,      // 收窄边界，使球体紧密堆积在屏幕中央
  maxY: 6.0,
  maxZ: 3.2,
  minY: 4.0,      // 生成高度起点
  floorY: 3.8,    // 地板高度，配合视角使得球体处于正中心
  controlSphere0: false,
  mouseRadius: 2.2,
  followCursor: true,
  lightIntensity: 300
};

function createRapierSpheres(canvas, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // 创建 ThreeJS 核心渲染环境
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090c15); // 参考图对应的深蓝色夜空底色
  scene.fog = new THREE.FogExp2(0x090c15, 0.02);

  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 1.8, 14.5); // 调整相机高度与距离，对准堆叠在中心的球体
  camera.lookAt(0, -0.2, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    powerPreference: 'high-performance',
    antialias: true,
    alpha: false
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // 1. 高品质环境反射图 (EnvMap)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envMap;

  // 2. 实时平面反射地板 (镜面反射)
  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const reflector = new Reflector(floorGeo, {
    clipBias: 0.003,
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x181818 // 暗色反射地板，呈现微弱高雅的镜面图景
  });
  reflector.rotateX(-Math.PI / 2);
  reflector.position.y = -config.floorY - 0.01;
  scene.add(reflector);

  // 3. 承接软阴影的地板 (与背景色融合)
  const floorShadowMat = new THREE.MeshPhysicalMaterial({
    color: 0x090c15,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65
  });
  const shadowFloor = new THREE.Mesh(floorGeo, floorShadowMat);
  shadowFloor.rotateX(-Math.PI / 2);
  shadowFloor.position.y = -config.floorY;
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);

  // 4. 逆光下的精细材质配置（分发 3 类材质，逼真再现玉石/烤漆质感）
  const sphereGeo = new THREE.SphereGeometry(1, 40, 40); // 极高细分数，保证球体圆润

  // 材质A: 磨砂玉石半透明玻璃（对应磨砂白灰球，具有次表面散射的体积感）
  const matFrostedGlass = new THREE.MeshPhysicalMaterial({
    roughness: 0.22,
    metalness: 0.05,
    transmission: 0.75, // 开启透光
    thickness: 1.8,     // 体积厚度，使边缘光发生偏折
    ior: 1.48,
    clearcoat: 0.2,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.8
  });

  // 材质B: 亮泽瓷感烤漆（对应绿/青球，漆面圆润饱满）
  const matGlossyPaint = new THREE.MeshPhysicalMaterial({
    roughness: 0.16,
    metalness: 0.12,
    clearcoat: 1.0,     // 强清漆外层
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.4
  });

  // 材质C: 深色金属漆漆面（对应深蓝/黑球，深邃冷峻）
  const matMetallicLacquer = new THREE.MeshPhysicalMaterial({
    roughness: 0.08,
    metalness: 0.88,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.8
  });

  const physics = new Physics3D(config);
  const paletteColors = config.colors.map(c => new THREE.Color(c));
  
  const meshes = [];

  function initSpheres() {
    // 释放旧有资源
    meshes.forEach(m => {
      scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    meshes.length = 0;

    physics.reset();

    for (let i = 0; i < config.count; i++) {
      // 随机分配三种高级质感材质
      // 约 35% 玉石透光， 45% 烤漆， 20% 金属漆
      const rand = Math.random();
      let baseMat;
      if (rand < 0.35) {
        baseMat = matFrostedGlass;
      } else if (rand < 0.8) {
        baseMat = matGlossyPaint;
      } else {
        baseMat = matMetallicLacquer;
      }

      const mat = baseMat.clone();
      const col = paletteColors[i % paletteColors.length];
      mat.color.copy(col);

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshes.push(mesh);
    }
  }

  initSpheres();

  // 5. 三点式高级布光系统 (Studio Lighting)
  const ambientLight = new THREE.AmbientLight(0x0b1120, 0.6); // 低强度深蓝填充
  scene.add(ambientLight);

  // 主聚光（正面右侧）投射阴影
  const dirLight = new THREE.DirectionalLight(0xffffff, 4.0);
  dirLight.position.set(7, 10, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 25;
  dirLight.shadow.camera.left = -6;
  dirLight.shadow.camera.right = 6;
  dirLight.shadow.camera.top = 8;
  dirLight.shadow.camera.bottom = -6;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // 关键逆光 (Rim Light，从左后方斜向上照向相机)
  // 这是使半透玉石球体的边缘泛起发光亮边的核心布光！
  const rimLight = new THREE.DirectionalLight(0xdaf0ff, 9.0); // 耀眼亮蓝白
  rimLight.position.set(-6, 3, -9);
  scene.add(rimLight);

  // 侧翼辅光 (Fill Light，淡淡的紫调，增加漆面暗部色彩层次)
  const fillLight = new THREE.DirectionalLight(0xc084fc, 1.2);
  fillLight.position.set(-8, 2, 5);
  scene.add(fillLight);

  // 鼠标排斥点光源
  const mouseLight = new THREE.PointLight(paletteColors[0], 12, 10, 1.2);
  scene.add(mouseLight);

  // 鼠标位置发光小球
  const mouseIndicatorGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const mouseIndicatorMat = new THREE.MeshBasicMaterial({ color: paletteColors[0] });
  const mouseIndicator = new THREE.Mesh(mouseIndicatorGeo, mouseIndicatorMat);
  scene.add(mouseIndicator);

  // 6. 后处理辉光渲染线 (UnrealBloomPass)
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // UnrealBloomPass: 阈值较低，半径中等，强度适中
  // 能够将高光处晕染出一层梦幻柔和的辉光
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
    0.65,  // 辉光强度 (Strength)
    0.85,  // 辉光半径 (Radius)
    0.18   // 辉光阈值 (Threshold)
  );
  composer.addPass(bloomPass);

  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const rayIntersection = new THREE.Vector3();

  // 自适应尺寸调节
  function handleResize() {
    const width = canvas.parentNode ? canvas.parentNode.offsetWidth : window.innerWidth;
    const height = canvas.parentNode ? canvas.parentNode.offsetHeight : window.innerHeight;
    
    camera.aspect = width / height;
    
    // 窄屏高度自适应
    if (camera.aspect < 1.3) {
      camera.position.z = 14.5 / Math.min(1.0, camera.aspect * 0.85);
    } else {
      camera.position.z = 14.5;
    }
    
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
    bloomPass.setSize(width, height);
  }
  
  window.addEventListener('resize', handleResize);
  handleResize();

  // 7. 渲染循环
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

    // 更新鼠标指示器与点光源
    if (config.controlSphere0 && config.followCursor) {
      mouseIndicator.position.copy(physics.center);
      mouseLight.position.copy(physics.center);
      mouseIndicator.visible = true;
      mouseLight.intensity = config.lightIntensity / 25;
    } else {
      mouseIndicator.visible = false;
      mouseLight.intensity = 0;
    }

    // 执行后处理辉光渲染
    composer.render();
  }

  animate();

  // 鼠标位置交互接口
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
        paletteColors.length = 0;
        config.colors.forEach(col => paletteColors.push(new THREE.Color(col)));
        mouseIndicatorMat.color.copy(paletteColors[0]);
        mouseLight.color.copy(paletteColors[0]);
        
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
      
      // 深度清理内存
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
      
      reflector.dispose();
      pmremGenerator.dispose();
      composer.dispose();
      renderer.dispose();
    }
  };
}

const RapierSpheres = ({
  className = '',
  count = 80,
  colors = ['#7f00ff', '#ffffff', '#1e293b'],
  minSize = 0.5,
  maxSize = 1.0,
  gravity = 0.9,
  friction = 0.99,
  wallBounce = 0.7,
  lightIntensity = 300,
  followCursor = true,
  ...props
}) => {
  const canvasRef = useRef(null);
  const controllerRef = useRef(null);

  // 指针滑动和触摸交互处理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 初始化 3D 物理球场景
    const controller = createRapierSpheres(canvas, {
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

  // 当属性更新时分发配置更新
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
