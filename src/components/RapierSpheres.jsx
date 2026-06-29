import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

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
      // 在高处随机分布生成
      positionData[base] = THREE.MathUtils.randFloatSpread(config.maxX * 1.5);
      positionData[base + 1] = THREE.MathUtils.randFloat(config.minY, config.maxY);
      positionData[base + 2] = THREE.MathUtils.randFloatSpread(config.maxZ * 1.5);

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
      const mouseRadius = config.mouseRadius || 2.5;
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

          // 施加一定的推力速度
          velocityData[base] += nx * overlap * 0.2 * 60;
          velocityData[base + 1] += ny * overlap * 0.2 * 60;
          velocityData[base + 2] += nz * overlap * 0.2 * 60;
        }
      }
    }

    // 4. 边界（箱体）碰撞约束
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
      if (py + r > config.maxY * 1.8) {
        py = config.maxY * 1.8 - r;
        vy = -vy * config.wallBounce;
      }

      // 左右侧壁 (X 轴边界)
      if (Math.abs(px) + r > config.maxX) {
        px = Math.sign(px) * (config.maxX - r);
        vx = -vx * config.wallBounce;
      }

      // 前后壁面 (Z 轴边界)
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

// 默认配置项
const DEFAULT_CONFIG = {
  count: 100,
  colors: ['#ff0055', '#aa00ff', '#00ffcc'],
  minSize: 0.35,
  maxSize: 0.9,
  gravity: 0.8,
  friction: 0.992,
  wallBounce: 0.75,
  maxVelocity: 0.25,
  maxX: 6.5,
  maxY: 6.0,
  maxZ: 4.0,
  minY: 6.0,
  floorY: 4.8, // 地板所处高度
  controlSphere0: false,
  mouseRadius: 2.2,
  followCursor: true
};

function createRapierSpheres(canvas, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  // 创建 ThreeJS 核心渲染环境
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 4, 15);
  camera.lookAt(0, 0, 0);

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
  renderer.toneMappingExposure = 1.0;

  // 1. 高品质环境映射 (EnvMap)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envMap;

  // 2. 实时镜面反射地板 (Real-time Reflector)
  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const reflector = new Reflector(floorGeo, {
    clipBias: 0.003,
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x222222
  });
  reflector.rotateX(-Math.PI / 2);
  reflector.position.y = -config.floorY - 0.01; // 微调防止深度冲突 (Z-fighting)
  scene.add(reflector);

  // 3. 承载软阴影的半透明地板层 (Shadow Receiver)
  const floorShadowMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
    roughnessMap: null
  });
  const shadowFloor = new THREE.Mesh(floorGeo, floorShadowMat);
  shadowFloor.rotateX(-Math.PI / 2);
  shadowFloor.position.y = -config.floorY;
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);

  // 4. 舞台装饰暗色壁面
  const wallGeo = new THREE.PlaneGeometry(30, 20);
  const wallMat = new THREE.MeshPhysicalMaterial({
    color: 0x111827,
    roughness: 0.5,
    metalness: 0.1,
    clearcoat: 0.2
  });
  
  // 后壁
  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.position.set(0, 4, -config.maxZ - 0.5);
  backWall.receiveShadow = true;
  scene.add(backWall);

  // 左壁
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(-config.maxX - 0.5, 4, 0);
  leftWall.rotateY(Math.PI / 2);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // 右壁
  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(config.maxX + 0.5, 4, 0);
  rightWall.rotateY(-Math.PI / 2);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // 5. 实例化球体 (InstancedMesh)
  const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
  const sphereMat = new THREE.MeshPhysicalMaterial({
    roughness: 0.08,
    metalness: 0.7,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05
  });
  
  let instMesh;
  const physics = new Physics3D(config);

  const paletteColors = config.colors.map(c => new THREE.Color(c));

  function initInstancedMesh() {
    if (instMesh) {
      scene.remove(instMesh);
      instMesh.geometry.dispose();
      instMesh.material.dispose();
    }
    
    instMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, config.count);
    instMesh.castShadow = true;
    instMesh.receiveShadow = true;
    scene.add(instMesh);

    // 分配球体实例颜色
    for (let i = 0; i < config.count; i++) {
      const col = paletteColors[i % paletteColors.length];
      instMesh.setColorAt(i, col);
    }
    instMesh.instanceColor.needsUpdate = true;
  }
  
  initInstancedMesh();

  // 6. 光源设置 (Lights)
  const ambientLight = new THREE.AmbientLight(0x0f172a, 0.45);
  scene.add(ambientLight);

  // 主定向光源（投射阴影）
  const dirLight = new THREE.DirectionalLight(0xffffff, 4.5);
  dirLight.position.set(8, 14, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // 鼠标交互点光源与发光小球
  const mouseLight = new THREE.PointLight(paletteColors[0], 12, 10, 1.2);
  mouseLight.castShadow = true;
  mouseLight.shadow.mapSize.width = 512;
  mouseLight.shadow.mapSize.height = 512;
  mouseLight.shadow.bias = -0.001;
  scene.add(mouseLight);

  const mouseIndicatorGeo = new THREE.SphereGeometry(0.35, 16, 16);
  const mouseIndicatorMat = new THREE.MeshBasicMaterial({ color: paletteColors[0] });
  const mouseIndicator = new THREE.Mesh(mouseIndicatorGeo, mouseIndicatorMat);
  scene.add(mouseIndicator);

  // 7. 鼠标射线投射
  const raycaster = new THREE.Raycaster();
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const rayIntersection = new THREE.Vector3();

  // 渲染尺寸自适应逻辑
  function handleResize() {
    const width = canvas.parentNode ? canvas.parentNode.offsetWidth : window.innerWidth;
    const height = canvas.parentNode ? canvas.parentNode.offsetHeight : window.innerHeight;
    
    camera.aspect = width / height;
    
    // 针对窄屏（如移动端）拉远相机或调整视野以防止内容出界
    if (camera.aspect < 1.3) {
      camera.position.z = 15 / Math.min(1.0, camera.aspect * 0.85);
    } else {
      camera.position.z = 15;
    }
    
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  
  window.addEventListener('resize', handleResize);
  handleResize();

  // 8. 动画渲染循环
  const clock = new THREE.Clock();
  let animationId;
  let isPaused = false;

  const dummy = new THREE.Object3D();

  function animate() {
    animationId = requestAnimationFrame(animate);

    if (isPaused) return;

    const delta = clock.getDelta();
    physics.update(delta);

    // 更新 InstancedMesh 的矩阵
    for (let i = 0; i < config.count; i++) {
      dummy.position.fromArray(physics.positionData, 3 * i);
      dummy.scale.setScalar(physics.sizeData[i]);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }
    instMesh.instanceMatrix.needsUpdate = true;

    // 更新鼠标指示器与点光源
    if (config.controlSphere0 && config.followCursor) {
      mouseIndicator.position.copy(physics.center);
      mouseLight.position.copy(physics.center);
      mouseIndicator.visible = true;
      mouseLight.intensity = config.lightIntensity / 25; // 换算合适光照范围
    } else {
      mouseIndicator.visible = false;
      mouseLight.intensity = 0;
    }

    renderer.render(scene, camera);
  }

  animate();

  // 交互事件监听接口
  const updateMousePosition = (nPos) => {
    raycaster.setFromCamera(nPos, camera);
    raycaster.ray.intersectPlane(interactionPlane, rayIntersection);
    physics.center.copy(rayIntersection);
    // 限制鼠标在物理盒内部深度的碰撞作用
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
        
        initInstancedMesh();
        physics.reset();
      } else {
        if (newConfig.minSize !== undefined || newConfig.maxSize !== undefined) {
          physics.setSizes();
        }
      }
    },
    dispose() {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      
      // 深度释放显存
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
      renderer.dispose();
    }
  };
}

const RapierSpheres = ({
  className = '',
  count = 100,
  colors = ['#ff0055', '#aa00ff', '#00ffcc'],
  minSize = 0.35,
  maxSize = 0.9,
  gravity = 0.8,
  friction = 0.992,
  wallBounce = 0.75,
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

    // 初始化 3D 渲染与物理控制器
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
