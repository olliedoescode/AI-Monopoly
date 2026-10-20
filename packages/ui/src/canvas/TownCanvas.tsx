import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

/**
 * Stage 0 placeholder. Stage 1 replaces the ground plane with generated road
 * splines, plot polygons, buildings and the town square landmarks.
 */
export function TownCanvas() {
  return (
    <Canvas camera={{ position: [0, 40, 40], fov: 45 }} shadows>
      <color attach="background" args={["#0b0e14"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[20, 40, 20]} intensity={1.1} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1b2430" />
      </mesh>
      <gridHelper args={[120, 60, "#2a3646", "#1f2937"]} />
      <OrbitControls enablePan enableZoom maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}
