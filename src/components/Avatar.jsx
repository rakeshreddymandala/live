// src/components/Avatar.jsx
import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';

function ReadyPlayerMeAvatar({ analyser, isPlaying }) {
  const gltfRef = useRef();
  const [mouthOpen, setMouthOpen] = useState(0);
  const [eyeBlink, setEyeBlink] = useState(1);
  const blinkTimerRef = useRef(0);

  // Load the ReadyPlayerMe model
  const { scene, nodes, materials } = useGLTF('https://models.readyplayer.me/68c6d8096e1393f19468b39e.glb');

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

    // Apply mouth animation to morph targets if available
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetInfluences) {
          // Common ReadyPlayerMe morph target names for mouth
          const morphTargetNames = child.morphTargetDictionary;
          if (morphTargetNames) {
            // Try common mouth morph targets
            if ('mouthOpen' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['mouthOpen']] = mouthOpen;
            }
            if ('jawOpen' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['jawOpen']] = mouthOpen * 0.5;
            }
            if ('viseme_aa' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['viseme_aa']] = mouthOpen * 0.3;
            }
          }
        }
      });
    }

    // Eye blinking
    blinkTimerRef.current += 0.016;
    if (blinkTimerRef.current > 3) {
      blinkTimerRef.current = 0;
      setEyeBlink(0);
      setTimeout(() => setEyeBlink(1), 150);
    }

    // Apply eye blink to morph targets
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetInfluences) {
          const morphTargetNames = child.morphTargetDictionary;
          if (morphTargetNames) {
            if ('eyeBlinkLeft' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['eyeBlinkLeft']] = 1 - eyeBlink;
            }
            if ('eyeBlinkRight' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['eyeBlinkRight']] = 1 - eyeBlink;
            }
          }
        }
      });
    }

    // Subtle head movement
    if (gltfRef.current) {
      const time = state.clock.elapsedTime;
      gltfRef.current.rotation.y = Math.sin(time * 0.3) * 0.05;
      gltfRef.current.position.y = Math.sin(time * 0.5) * 0.02;
    }
  });

  // Move avatar UP significantly to show head/face area for chatbot
  return (
    <group ref={gltfRef} position={[0, 2.8, 0]} scale={[1.8, 1.8, 1.8]} rotation={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the model
useGLTF.preload('https://models.readyplayer.me/68c6d8096e1393f19468b39e.glb');

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
        camera={{ position: [0, 1.5, 2.2], fov: 28 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} />
        
        <Suspense fallback={<mesh><boxGeometry /><meshBasicMaterial color="gray" /></mesh>}>
          <ReadyPlayerMeAvatar analyser={analyserRef.current} isPlaying={isPlaying} />
        </Suspense>
        
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          maxDistance={3.5}
          minDistance={1.8}
          target={[0, 2.8, 0]}
        />
      </Canvas>
    </div>
  );
}
