import { useState } from 'react';
import Ballpit from './components/Ballpit';
import RapierSpheres from './components/RapierSpheres';

const PALETTES = [
  {
    name: '晶莹紫白 (Crystal Violet)',
    colors: ['#7f00ff', '#ffffff', '#1e293b'],
    preview: ['#7f00ff', '#ffffff', '#1e293b']
  },
  {
    name: '赛博霓虹 (Cyberpunk)',
    colors: ['#ff0055', '#aa00ff', '#00ffcc'],
    preview: ['#ff0055', '#aa00ff', '#00ffcc']
  },
  {
    name: '落日熔金 (Sunset Glow)',
    colors: ['#ff5f6d', '#ffc371', '#e25f38'],
    preview: ['#ff5f6d', '#ffc371', '#e25f38']
  },
  {
    name: '薄荷深蓝 (Ocean Mint)',
    colors: ['#0072ff', '#00c6ff', '#00f5a0'],
    preview: ['#0072ff', '#00c6ff', '#00f5a0']
  },
  {
    name: '极简晶莹 (Crystal Mono)',
    colors: ['#ffffff', '#a8b2c1', '#334155'],
    preview: ['#ffffff', '#a8b2c1', '#334155']
  },
  {
    name: '翡翠森林 (Emerald Forest)',
    colors: ['#11998e', '#38ef7d', '#a8ff78'],
    preview: ['#11998e', '#38ef7d', '#a8ff78']
  },
  {
    name: '薰衣幻境 (Lavender)',
    colors: ['#e0c3fc', '#8ec5fc', '#c2e9fb'],
    preview: ['#e0c3fc', '#8ec5fc', '#c2e9fb']
  }
];

function App() {
  // 当前选择的特效: 'ballpit' (气泡墙) 或 'rapier' (3D重力物理球)
  const [currentEffect, setCurrentEffect] = useState('ballpit');

  // 特效1 (Ballpit) 独立参数状态
  const [count, setCount] = useState(160);
  const [gravity, setGravity] = useState(0.5);
  const [friction, setFriction] = useState(0.9975);
  const [wallBounce, setWallBounce] = useState(0.95);
  const [followCursor, setFollowCursor] = useState(true);
  const [minSize, setMinSize] = useState(0.4);
  const [maxSize, setMaxSize] = useState(0.95);
  const [lightIntensity, setLightIntensity] = useState(600);

  // 特效2 (Rapier 3D) 独立参数状态
  const [rapierCount, setRapierCount] = useState(100);
  const [rapierGravity, setRapierGravity] = useState(0.8);
  const [rapierFriction, setRapierFriction] = useState(0.992);
  const [rapierWallBounce, setRapierWallBounce] = useState(0.75);
  const [rapierFollowCursor, setRapierFollowCursor] = useState(true);
  const [rapierMinSize, setRapierMinSize] = useState(0.35);
  const [rapierMaxSize, setRapierMaxSize] = useState(0.9);
  const [rapierLightIntensity, setRapierLightIntensity] = useState(300);
  const [rapierResetKey, setRapierResetKey] = useState(0);

  // 公共 UI 状态
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const colors = PALETTES[selectedPaletteIdx].colors;

  // 复制代码块生成
  const handleCopyCode = () => {
    let codeString = '';
    if (currentEffect === 'ballpit') {
      codeString = `import Ballpit from './components/Ballpit';

function Background() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Ballpit
        count={${count}}
        gravity={${gravity}}
        friction={${friction}}
        wallBounce={${wallBounce}}
        followCursor={${followCursor}}
        minSize={${minSize}}
        maxSize={${maxSize}}
        colors={${JSON.stringify(colors)}}
        lightIntensity={${lightIntensity}}
      />
    </div>
  );
}`;
    } else {
      codeString = `import RapierSpheres from './components/RapierSpheres';

function Background() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <RapierSpheres
        count={${rapierCount}}
        gravity={${rapierGravity}}
        friction={${rapierFriction}}
        wallBounce={${rapierWallBounce}}
        followCursor={${rapierFollowCursor}}
        minSize={${rapierMinSize}}
        maxSize={${rapierMaxSize}}
        colors={${JSON.stringify(colors)}}
        lightIntensity={${rapierLightIntensity}}
      />
    </div>
  );
}`;
    }

    navigator.clipboard.writeText(codeString)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <>
      {/* 顶部悬浮导航栏 */}
      <div className="nav-container">
        <div className="nav-bar">
          <button 
            className={`nav-item ${currentEffect === 'ballpit' ? 'active' : ''}`}
            onClick={() => setCurrentEffect('ballpit')}
          >
            <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            弹性气泡墙
          </button>
          <button 
            className={`nav-item ${currentEffect === 'rapier' ? 'active' : ''}`}
            onClick={() => setCurrentEffect('rapier')}
          >
            <svg className="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="4"></circle>
            </svg>
            重力物理球
          </button>
        </div>
      </div>

      {/* 渲染对应的 3D 背景环境 */}
      <div className="ballpit-wrapper">
        {currentEffect === 'ballpit' ? (
          <Ballpit
            count={count}
            gravity={gravity}
            friction={friction}
            wallBounce={wallBounce}
            followCursor={followCursor}
            minSize={minSize}
            maxSize={maxSize}
            colors={colors}
            lightIntensity={lightIntensity}
          />
        ) : (
          <RapierSpheres
            key={`rapier-${rapierResetKey}`}
            count={rapierCount}
            gravity={rapierGravity}
            friction={rapierFriction}
            wallBounce={rapierWallBounce}
            followCursor={rapierFollowCursor}
            minSize={rapierMinSize}
            maxSize={rapierMaxSize}
            colors={colors}
            lightIntensity={rapierLightIntensity}
          />
        )}
      </div>

      {/* 悬浮提示框 */}
      {((currentEffect === 'ballpit' && followCursor) || (currentEffect === 'rapier' && rapierFollowCursor)) && (
        <div className="interaction-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          {currentEffect === 'ballpit' ? '移动鼠标以排斥/吸引气泡' : '移动鼠标以发光并排斥物理球'}
        </div>
      )}

      {/* 显示/隐藏面板按钮 */}
      <button 
        className={`icon-btn toggle-panel-btn ${isPanelOpen ? 'panel-open' : ''}`}
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        title={isPanelOpen ? "隐藏控制面板" : "显示控制面板"}
        aria-label="Toggle settings panel"
      >
        {isPanelOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
        )}
      </button>

      {/* 悬浮控制面板 */}
      <div className={`panel-container ${isPanelOpen ? '' : 'hidden'}`}>
        <div className="panel-header">
          <h2 className="panel-title">
            {currentEffect === 'ballpit' ? 'Ballpit Background' : 'Rapier Spheres 3D'}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>v1.1</span>
        </div>

        <div className="panel-body">
          {/* 特效1 (Ballpit) 调参面板 */}
          {currentEffect === 'ballpit' && (
            <>
              {/* Slider: Count */}
              <div className="control-group">
                <div className="control-label">
                  <span>气泡数量</span>
                  <span className="control-val">{count}</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="350" 
                  step="5" 
                  value={count} 
                  onChange={(e) => setCount(Number(e.target.value))} 
                />
              </div>

              {/* Slider: Gravity */}
              <div className="control-group">
                <div className="control-label">
                  <span>物理重力</span>
                  <span className="control-val">{gravity.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="2.5" 
                  step="0.05" 
                  value={gravity} 
                  onChange={(e) => setGravity(Number(e.target.value))} 
                />
              </div>

              {/* Slider: Friction */}
              <div className="control-group">
                <div className="control-label">
                  <span>阻力 (摩擦系数)</span>
                  <span className="control-val">{friction.toFixed(4)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.95" 
                  max="1.0" 
                  step="0.0005" 
                  value={friction} 
                  onChange={(e) => setFriction(Number(e.target.value))} 
                />
              </div>

              {/* Slider: Wall Bounce */}
              <div className="control-group">
                <div className="control-label">
                  <span>壁面反弹力</span>
                  <span className="control-val">{wallBounce.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.4" 
                  max="1.1" 
                  step="0.02" 
                  value={wallBounce} 
                  onChange={(e) => setWallBounce(Number(e.target.value))} 
                />
              </div>

              {/* Slider: Size Range */}
              <div className="control-group">
                <div className="control-label">
                  <span>气泡尺寸范围</span>
                  <span className="control-val">{minSize.toFixed(2)} - {maxSize.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.2" 
                    step="0.05" 
                    value={minSize} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMinSize(val);
                      if (val > maxSize) setMaxSize(val);
                    }} 
                  />
                  <input 
                    type="range" 
                    min="0.4" 
                    max="3.0" 
                    step="0.05" 
                    value={maxSize} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMaxSize(val);
                      if (val < minSize) setMinSize(val);
                    }} 
                  />
                </div>
              </div>

              {/* Slider: Light Intensity */}
              <div className="control-group">
                <div className="control-label">
                  <span>鼠标光源强度</span>
                  <span className="control-val">{lightIntensity}</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="1500" 
                  step="50" 
                  value={lightIntensity} 
                  onChange={(e) => setLightIntensity(Number(e.target.value))} 
                />
              </div>

              {/* Toggle: Follow Cursor */}
              <div className="switch-container">
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>开启鼠标排斥交互</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={followCursor} 
                    onChange={(e) => setFollowCursor(e.target.checked)} 
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </>
          )}

          {/* 特效2 (Rapier 3D) 调参面板 */}
          {currentEffect === 'rapier' && (
            <>
              {/* Slider: Count */}
              <div className="control-group">
                <div className="control-label">
                  <span>球体数量</span>
                  <span className="control-val">{rapierCount}</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="200" 
                  step="5" 
                  value={rapierCount} 
                  onChange={(e) => setRapierCount(Number(e.target.value))} 
                />
              </div>

              {/* Slider: Gravity */}
              <div className="control-group">
                <div className="control-label">
                  <span>重力系数</span>
                  <span className="control-val">{rapierGravity.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="3.0" 
                  step="0.05" 
                  value={rapierGravity} 
                  onChange={(e) => setRapierGravity(Number(e.target.value))} 
                />
              </div>

              {/* Slider: Friction */}
              <div className="control-group">
                <div className="control-label">
                  <span>空气与滚动摩擦力</span>
                  <span className="control-val">{rapierFriction.toFixed(4)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.95" 
                  max="1.0" 
                  step="0.0005" 
                  value={rapierFriction} 
                  onChange={(e) => setRapierFriction(Number(e.target.value))} 
                />
              </div>

              {/* Slider: Wall Bounce */}
              <div className="control-group">
                <div className="control-label">
                  <span>球体回弹系数</span>
                  <span className="control-val">{rapierWallBounce.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.2" 
                  max="1.0" 
                  step="0.02" 
                  value={rapierWallBounce} 
                  onChange={(e) => setRapierWallBounce(Number(e.target.value))} 
                />
              </div>

              {/* Slider: Size Range */}
              <div className="control-group">
                <div className="control-label">
                  <span>尺寸大小范围</span>
                  <span className="control-val">{rapierMinSize.toFixed(2)} - {rapierMaxSize.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05" 
                    value={rapierMinSize} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRapierMinSize(val);
                      if (val > rapierMaxSize) setRapierMaxSize(val);
                    }} 
                  />
                  <input 
                    type="range" 
                    min="0.3" 
                    max="2.5" 
                    step="0.05" 
                    value={rapierMaxSize} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRapierMaxSize(val);
                      if (val < rapierMinSize) setRapierMinSize(val);
                    }} 
                  />
                </div>
              </div>

              {/* Slider: Light Intensity */}
              <div className="control-group">
                <div className="control-label">
                  <span>鼠标交互光源亮度</span>
                  <span className="control-val">{rapierLightIntensity}</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="1000" 
                  step="50" 
                  value={rapierLightIntensity} 
                  onChange={(e) => setRapierLightIntensity(Number(e.target.value))} 
                />
              </div>

              {/* Toggle: Follow Cursor */}
              <div className="switch-container">
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>开启鼠标碰撞作用力</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={rapierFollowCursor} 
                    onChange={(e) => setRapierFollowCursor(e.target.checked)} 
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {/* Action Reset Button */}
              <button 
                className="btn-reset"
                onClick={() => setRapierResetKey(prev => prev + 1)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
                重新随机坠落球体
              </button>
            </>
          )}

          {/* Color Themes */}
          <div className="control-group">
            <span className="control-label">色彩主题</span>
            <div className="palettes-grid">
              {PALETTES.map((palette, index) => (
                <div 
                  key={index} 
                  className={`palette-card ${selectedPaletteIdx === index ? 'active' : ''}`}
                  onClick={() => setSelectedPaletteIdx(index)}
                >
                  <span className="palette-name">{palette.name}</span>
                  <div className="palette-preview">
                    {palette.preview.map((color, colorIdx) => (
                      <div 
                        key={colorIdx} 
                        className="palette-preview-color" 
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generated Code Block */}
          <div className="control-group" style={{ marginTop: 'auto' }}>
            <span className="control-label">集成代码</span>
            <div className="code-block-container">
              <div className="code-header">
                <span className="code-title">React Component</span>
                <button 
                  className={`copy-btn ${copied ? 'copied' : ''}`} 
                  onClick={handleCopyCode}
                >
                  {copied ? '已复制!' : '复制代码'}
                </button>
              </div>
              <div className="code-content">
                {currentEffect === 'ballpit' ? (
`<Ballpit
  count={${count}}
  gravity={${gravity}}
  friction={${friction}}
  wallBounce={${wallBounce}}
  followCursor={${followCursor}}
  minSize={${minSize}}
  maxSize={${maxSize}}
  colors={${JSON.stringify(colors)}}
/>`
                ) : (
`<RapierSpheres
  count={${rapierCount}}
  gravity={${rapierGravity}}
  friction={${rapierFriction}}
  wallBounce={${rapierWallBounce}}
  followCursor={${rapierFollowCursor}}
  minSize={${rapierMinSize}}
  maxSize={${rapierMaxSize}}
  colors={${JSON.stringify(colors)}}
/>`
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
