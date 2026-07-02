import { useState } from "react";
import {
  Draggable,
  Glass,
  GlassButton,
  GlassMenu,
  GlassPanel,
  GlassSegmented,
  GlassSlider,
  GlassSwitch,
} from "../glass-kit";
import "./demo.css";

const PHOTOS = [
  "aurora", "ember", "tide", "grove", "dune", "violet",
  "harbor", "canyon", "bloom", "frost", "marble", "coral",
  "slate", "amber", "fern", "dusk", "ridge", "lagoon",
  "willow", "cobalt", "rust", "sienna", "mint", "onyx",
  "peony", "delta", "quartz",
];

export function App() {
  // scene-wide glass parameters, driven live by the control panel
  const [blur, setBlur] = useState(0);
  const [depth, setDepth] = useState(10);
  const [chroma, setChroma] = useState(0);
  const [radius, setRadius] = useState(47);
  const [specular, setSpecular] = useState(3);
  const [stiffness, setStiffness] = useState(180);

  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(64);
  const [hi, setHi] = useState(true);

  // Slide button (thumb) custom control states tuned for very large left-edge refraction
  const [thumbW, setThumbW] = useState(70);
  const [thumbH, setThumbH] = useState(27);
  const [thumbRadius, setThumbRadius] = useState(19);
  const [thumbScale, setThumbScale] = useState(0.550); // very large refraction scale
  const [thumbDepth, setThumbDepth] = useState(1);     // thin edge of refraction
  const [thumbCurvature, setThumbCurvature] = useState(0);
  const [thumbSplay, setThumbSplay] = useState(2.00);
  const [thumbChroma, setThumbChroma] = useState(0.00);
  const [thumbBlur, setThumbBlur] = useState(0.0);
  const [thumbGlow, setThumbGlow] = useState(0.00);
  const [thumbEdgeHighlight, setThumbEdgeHighlight] = useState(0.00);
  const [thumbSpecularAngle, setThumbSpecularAngle] = useState(0);
  const [refractLeftOnly, setRefractLeftOnly] = useState(false);

  const damping = Math.round(1.5 * Math.sqrt(stiffness));

  const panel = {
    blurAmount: blur,
    depth,
    chromaAmount: chroma,
    specularStrength: specular,
    // On WebKit/Firefox the kit clones this backdrop into each lens and runs the
    // displacement filter on the clone (real refraction); Chromium ignores it
    // and refracts the live backdrop directly.
    backdropSelector: ".backdrop",
  };

  return (
    <div className="scene">
      <div className="backdrop">
        {PHOTOS.map((seed) => (
          <img key={seed} src={`https://picsum.photos/seed/${seed}/900/700`} alt="" />
        ))}
      </div>
      <div className="backdrop-grain" />

      <header className="scene__title">
        <p className="eyebrow">glass-kit · rebuilt from aave.com</p>
        <h1>Liquid Glass</h1>
        <p className="sub">
          Drag anything. Controls are solid at rest and morph into glass while
          you touch them. The sliders retune every panel live.
        </p>
      </header>

      {/* Control panel — sliders that tune the whole scene */}
      <Draggable initial={{ x: 48, y: 250 }} z={20}>
        <GlassPanel width={312} height={510} borderRadius={radius} {...panel}>
          <h2 className="panel-title">Glass controls</h2>
          <GlassSlider label="Blur" value={blur} min={0} max={8} step={0.5} onChange={setBlur} display={`${blur}px`} {...panel} />
          <GlassSlider label="Depth / bevel" value={depth} min={1} max={20} onChange={setDepth} {...panel} />
          <GlassSlider label="Chromatic" value={chroma} min={0} max={2} step={0.05} onChange={setChroma} display={chroma.toFixed(2)} {...panel} />
          <GlassSlider label="Corner radius" value={radius} min={12} max={70} onChange={setRadius} display={`${radius}px`} {...panel} />
          <GlassSlider label="Specular" value={specular} min={0} max={3} step={0.1} onChange={setSpecular} display={specular.toFixed(1)} {...panel} />
          <GlassSlider label="Segment speed" value={stiffness} min={40} max={500} onChange={setStiffness} display={stiffness === 180 ? "Medium" : stiffness < 100 ? "Slow" : stiffness > 350 ? "Fast" : `${stiffness}`} {...panel} />
        </GlassPanel>
      </Draggable>

      {/* Media card */}
      <Draggable initial={{ x: 470, y: 150 }} z={18}>
        <Glass width={372} height={216} borderRadius={radius} {...panel}>
          <div className="media">
            <div className="media__meta">
              <span className="media__tag">Now playing</span>
              <strong>Refraction, Pt. II</strong>
              <span className="media__artist">glass-kit</span>
            </div>
            <div className="media__controls">
              <GlassButton width={46} height={46} {...panel}>⏮</GlassButton>
              <GlassButton width={56} height={56} {...panel} onClick={() => setPlaying((p) => !p)}>
                {playing ? "⏸" : "▶"}
              </GlassButton>
              <GlassButton width={46} height={46} {...panel}>⏭</GlassButton>
            </div>
            <GlassSlider label="Volume" value={volume} min={0} max={100} onChange={setVolume} display={`${volume}%`} {...panel} />
          </div>
        </Glass>
      </Draggable>

      {/* Segmented tabs */}
      <Draggable initial={{ x: 500, y: 430 }} z={17}>
        <GlassSegmented
          tabs={["Supply", "Borrow", "Swap", "Stake"]}
          stiffness={stiffness}
          damping={damping}
          {...panel}
        />
      </Draggable>

      {/* Liquid morph-out menu */}
      <Draggable initial={{ x: 905, y: 200 }} z={19}>
        <GlassMenu label="Actions" items={["Deposit", "Withdraw", "Bridge", "Repay"]} {...panel} />
      </Draggable>

      {/* Buttons */}
      <Draggable initial={{ x: 520, y: 520 }} z={16}>
        <div className="button-row">
          <GlassButton {...panel}>Connect</GlassButton>
          <GlassButton {...panel}>Claim</GlassButton>
        </div>
      </Draggable>

      {/* Switch + stat */}
      <Draggable initial={{ x: 760, y: 900 }} z={14}>
        <Glass width={300} height={150} borderRadius={radius} {...panel}>
          <div className="stat">
            <div className="stat__row">
              <GlassSwitch checked={hi} onChange={setHi} {...panel} />
              <span className="stat__label">{hi ? "High yield" : "Stable"}</span>
            </div>
            <div className="stat__num">
              <span>{hi ? "4.92" : "2.10"}<small>% APY</small></span>
            </div>
          </div>
        </Glass>
      </Draggable>

      {/* Replicated Image Slider Demo Card */}
      <Draggable initial={{ x: 420, y: 720 }} z={15}>
        <div className="grid-slider-demo-container">
          <div className="grid-slider-demo-card">
            <GlassSlider
              value={volume}
              min={0}
              max={100}
              onChange={setVolume}
              tintColor="255 255 255"
              tintOpacity={0.06}
              depth={thumbDepth}
              chromaAmount={thumbChroma}
              blurAmount={thumbBlur}
              scaleX={thumbScale}
              scaleY={thumbScale}
              domeDepth={thumbCurvature}
              splayAmount={thumbSplay}
              glowStrength={thumbGlow}
              edgeStrength={thumbEdgeHighlight}
              specularRotation={thumbSpecularAngle}
              refractLeftSideOnly={refractLeftOnly}
              thumbW={thumbW}
              thumbH={thumbH}
              borderRadius={thumbRadius}
            />
          </div>
        </div>
      </Draggable>

      {/* Dedicated Thumb Controls Panel */}
      <Draggable initial={{ x: 420, y: 250 }} z={20}>
        <GlassPanel width={700} height={440} borderRadius={radius} {...panel}>
          <div className="thumb-controls-header">
            <h2 className="panel-title" style={{ margin: 0 }}>Slide Button Controls</h2>
            <div className="refract-toggle-row">
              <input
                type="checkbox"
                id="refractLeftOnly"
                checked={refractLeftOnly}
                onChange={(e) => setRefractLeftOnly(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <label htmlFor="refractLeftOnly" style={{ cursor: "pointer" }}>Left Side Only Refraction</label>
            </div>
          </div>
          <div className="thumb-controls-grid">
            <div className="thumb-controls-col">
              <GlassSlider label="Width" value={thumbW} min={24} max={100} onChange={setThumbW} {...panel} />
              <GlassSlider label="BorderRadius" value={thumbRadius} min={0} max={40} onChange={setThumbRadius} {...panel} />
              <GlassSlider label="Depth" value={thumbDepth} min={1} max={20} onChange={setThumbDepth} {...panel} />
              <GlassSlider label="Splay" value={thumbSplay} min={0} max={2} step={0.05} onChange={setThumbSplay} display={thumbSplay.toFixed(2)} {...panel} />
              <GlassSlider label="Blur" value={thumbBlur} min={0} max={8} step={0.5} onChange={setThumbBlur} display={`${thumbBlur}px`} {...panel} />
              <GlassSlider label="Edge Highlight" value={thumbEdgeHighlight} min={0} max={1} step={0.05} onChange={setThumbEdgeHighlight} display={thumbEdgeHighlight.toFixed(2)} {...panel} />
            </div>
            <div className="thumb-controls-col">
              <GlassSlider label="Height" value={thumbH} min={16} max={80} onChange={setThumbH} {...panel} />
              <GlassSlider label="Scale" value={thumbScale} min={0} max={1} step={0.005} onChange={setThumbScale} display={thumbScale.toFixed(3)} {...panel} />
              <GlassSlider label="Curvature" value={thumbCurvature} min={0} max={100} onChange={setThumbCurvature} {...panel} />
              <GlassSlider label="Chroma" value={thumbChroma} min={0} max={2} step={0.05} onChange={setThumbChroma} display={thumbChroma.toFixed(2)} {...panel} />
              <GlassSlider label="Glow" value={thumbGlow} min={0} max={1} step={0.05} onChange={setThumbGlow} display={thumbGlow.toFixed(2)} {...panel} />
              <GlassSlider label="Specular Angle" value={thumbSpecularAngle} min={0} max={360} onChange={setThumbSpecularAngle} display={`${thumbSpecularAngle}°`} {...panel} />
            </div>
          </div>
        </GlassPanel>
      </Draggable>

      {/* Pure-refraction orb */}
      <Draggable initial={{ x: 300, y: 1250 }} z={12}>
        <Glass width={132} height={132} borderRadius={66} {...panel} depth={depth + 4} className="orb" />
      </Draggable>
    </div>
  );
}
