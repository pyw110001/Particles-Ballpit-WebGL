import { useState } from 'react';
import Ballpit from './components/Ballpit';

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
  const [count, setCount] = useState(160);
  const [gravity, setGravity] = useState(0.5);
  const [friction, setFriction] = useState(0.9975);
  const [wallBounce, setWallBounce] = useState(0.95);
  const [followCursor, setFollowCursor] = useState(true);
  const [minSize, setMinSize] = useState(0.4);
  const [maxSize, setMaxSize] = useState(0.95);
  const [lightIntensity, setLightIntensity] = useState(600);
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const colors = PALETTES[selectedPaletteIdx].colors;

  const handleCopyCode = () => {
    const codeString = `import Ballpit from './components/Ballpit';

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
      {/* Ballpit Background wrapper */}
      <div className="ballpit-wrapper">
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
      </div>

      {/* Floating Attraction Toast */}
      {followCursor && (
        <div className="interaction-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          移动鼠标以排斥/吸引球体
        </div>
      )}

      {/* Show/Hide Panel Button */}
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

      {/* Floating Settings Panel */}
      <div className={`panel-container ${isPanelOpen ? '' : 'hidden'}`}>
        <div className="panel-header">
          <h2 className="panel-title">Ballpit Background</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>v1.0</span>
        </div>

        <div className="panel-body">
          {/* Slider: Count */}
          <div className="control-group">
            <div className="control-label">
              <span>球体数量</span>
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
              <span>摩擦力 (减速系数)</span>
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
              <span>壁面回弹力</span>
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
              <span>球体尺寸范围</span>
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
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>跟随/排斥鼠标</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={followCursor} 
                onChange={(e) => setFollowCursor(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Preset Color Palettes */}
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
{`<Ballpit
  count={${count}}
  gravity={${gravity}}
  friction={${friction}}
  wallBounce={${wallBounce}}
  followCursor={${followCursor}}
  minSize={${minSize}}
  maxSize={${maxSize}}
  colors={${JSON.stringify(colors)}}
/>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
