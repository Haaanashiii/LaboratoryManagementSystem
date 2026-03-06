import Orb from '../ui/Orb';

export default function LandingBG() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Orb
        hoverIntensity={0.98}
        rotateOnHover
        hue={54}
        forceHoverState={false}
        backgroundColor="#0a0f1e"
      />
    </div>
  );
}
