// src/components/Avatar.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function TalkingHead({ analyser, isPlaying }) {
  const headRef = useRef();
  const mouthRef = useRef();
  const leftEyeRef = useRef();
  const rightEyeRef = useRef();
  const [mouthOpen, setMouthOpen] = useState(0);
  const [eyeBlink, setEyeBlink] = useState(1);
  const blinkTimerRef = useRef(0);

  useFrame((state) => {
    // Audio-reactive mouth animation
    if (isPlaying && analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      const speechRange = dataArray.slice(5, 50);
      const avg = speechRange.reduce((a, b) => a + b, 0) / speechRange.length;
      const normalizedVolume = Math.min(avg / 128, 1);
      
      setMouthOpen(normalizedVolume * 0.8);
    } else {
      // Test animation when not playing audio
      const time = state.clock.elapsedTime;
      const testMouth = Math.sin(time * 2) * 0.2 + 0.2;
      setMouthOpen(testMouth);
    }

    // Mouth animation
    if (mouthRef.current) {
      mouthRef.current.scale.y = 0.3 + mouthOpen * 0.7;
      mouthRef.current.scale.x = 1 + mouthOpen * 0.2;
    }

    // Eye blinking
    blinkTimerRef.current += 0.016;
    if (blinkTimerRef.current > 3) {
      blinkTimerRef.current = 0;
      setEyeBlink(0);
      setTimeout(() => setEyeBlink(1), 150);
    }

    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = eyeBlink;
      rightEyeRef.current.scale.y = eyeBlink;
    }

    // Head movement
    if (headRef.current) {
      const time = state.clock.elapsedTime;
      headRef.current.rotation.y = Math.sin(time * 0.3) * 0.05;
      headRef.current.position.y = Math.sin(time * 0.5) * 0.02;
    }
  });

  return (
    <group ref={headRef} position={[0, 0, 0]}>
      {/* Head */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#FDBCB4" />
      </mesh>

      {/* Left Eye */}
      <mesh ref={leftEyeRef} position={[-0.3, 0.15, 0.85]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Right Eye */}
      <mesh ref={rightEyeRef} position={[0.3, 0.15, 0.85]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Left Pupil */}
      <mesh position={[-0.3, 0.15, 0.95]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>

      {/* Right Pupil */}
      <mesh position={[0.3, 0.15, 0.95]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>

      {/* Nose */}
      <mesh position={[0, -0.05, 0.9]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#F5A97F" />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouthRef} position={[0, -0.25, 0.95]}>
        <boxGeometry args={[0.4, 0.12, 0.04]} />
        <meshStandardMaterial color="#CC0000" />
      </mesh>

      {/* Left Eyebrow */}
      <mesh position={[-0.3, 0.35, 0.82]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.25, 0.04, 0.02]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Right Eyebrow */}
      <mesh position={[0.3, 0.35, 0.82]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.25, 0.04, 0.02]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  );
}

export default function Avatar({ audioRef, isPlaying, setIsPlaying }) {
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) return;
    
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }
      
      if (isPlaying && audioRef.current.src && !sourceRef.current) {
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        
        try {
          sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioCtxRef.current.destination);
        } catch (err) {
          console.log('Audio source connection info:', err.message);
        }
      }
    } catch (error) {
      console.error('Audio context error:', error);
    }

    const handleAudioEnd = () => {
      sourceRef.current = null;
    };

    if (audioRef.current) {
      audioRef.current.addEventListener('ended', handleAudioEnd);
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('ended', handleAudioEnd);
        }
      };
    }
  }, [isPlaying, audioRef]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas 
        camera={{ position: [0, 0, 3], fov: 75 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} />
        
        <TalkingHead analyser={analyserRef.current} isPlaying={isPlaying} />
        
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          maxDistance={6}
          minDistance={1.5}
        />
      </Canvas>
    </div>
  );
}
