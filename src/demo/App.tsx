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

  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(64);
  const [hi, setHi] = useState(true);

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
        <GlassPanel width={312} height={446} borderRadius={radius} {...panel}>
          <h2 className="panel-title">Glass controls</h2>
          <GlassSlider label="Blur" value={blur} min={0} max={8} step={0.5} onChange={setBlur} display={`${blur}px`} {...panel} />
          <GlassSlider label="Depth / bevel" value={depth} min={1} max={20} onChange={setDepth} {...panel} />
          <GlassSlider label="Chromatic" value={chroma} min={0} max={2} step={0.05} onChange={setChroma} display={chroma.toFixed(2)} {...panel} />
          <GlassSlider label="Corner radius" value={radius} min={12} max={70} onChange={setRadius} display={`${radius}px`} {...panel} />
          <GlassSlider label="Specular" value={specular} min={0} max={3} step={0.1} onChange={setSpecular} display={specular.toFixed(1)} {...panel} />
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
        <GlassSegmented tabs={["Supply", "Borrow", "Swap", "Stake"]} {...panel} />
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
        <Glass width={260} height={150} borderRadius={radius} {...panel}>
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

      {/* Pure-refraction orb */}
      <Draggable initial={{ x: 300, y: 1250 }} z={12}>
        <Glass width={132} height={132} borderRadius={66} {...panel} depth={depth + 4} className="orb" />
      </Draggable>
    </div>
  );
}
