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

  // Debug: Log available morph targets once
  useEffect(() => {
    if (scene) {
      console.log('Available morph targets:');
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary) {
          console.log('Mesh:', child.name, 'Morph targets:', Object.keys(child.morphTargetDictionary));
        }
      });
    }
  }, [scene]);

  useFrame((state) => {
    // Enhanced professional audio-reactive mouth animation
    if (isPlaying && analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      // Multiple frequency ranges for more accurate lip-sync
      const lowFreq = dataArray.slice(1, 8);   // Low frequencies (vowels)
      const midFreq = dataArray.slice(8, 25);  // Mid frequencies (consonants)
      const highFreq = dataArray.slice(25, 50); // High frequencies (sibilants)
      
      const lowAvg = lowFreq.reduce((a, b) => a + b, 0) / lowFreq.length;
      const midAvg = midFreq.reduce((a, b) => a + b, 0) / midFreq.length;
      const highAvg = highFreq.reduce((a, b) => a + b, 0) / highFreq.length;
      
      // Normalize each frequency range
      const lowNorm = Math.min(lowAvg / 255, 1);
      const midNorm = Math.min(midAvg / 255, 1);
      const highNorm = Math.min(highAvg / 255, 1);
      
      // Calculate different mouth shapes based on frequency content
      const vowelMouth = lowNorm * 0.8;        // Open mouth for vowels
      const consonantMouth = midNorm * 0.4;    // Smaller opening for consonants
      const sibilantMouth = highNorm * 0.2;    // Tight mouth for s/sh sounds
      
      // Combine for natural mouth movement
      const combinedMouth = Math.max(vowelMouth, consonantMouth, sibilantMouth);
      
      // Smooth the animation with interpolation
      const currentMouth = mouthOpen;
      const smoothedMouth = currentMouth + (combinedMouth - currentMouth) * 0.25;
      
      setMouthOpen(Math.max(0, Math.min(1, smoothedMouth)));
    } else {
      // Improved test animation when not playing audio
      const time = state.clock.elapsedTime;
      const naturalSpeech = Math.sin(time * 3) * 0.3 + 
                           Math.sin(time * 7) * 0.1 + 
                           Math.sin(time * 11) * 0.05;
      const testMouth = Math.max(0, naturalSpeech * 0.5 + 0.2);
      setMouthOpen(testMouth);
    }

    // Enhanced morph target application with better mapping
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetInfluences) {
          const morphTargetNames = child.morphTargetDictionary;
          if (morphTargetNames) {
            // More comprehensive morph target mapping
            const mouthIntensity = mouthOpen;
            
            // Primary mouth movements
            if ('mouthOpen' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['mouthOpen']] = mouthIntensity * 0.9;
            }
            if ('jawOpen' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['jawOpen']] = mouthIntensity * 0.7;
            }
            
            // Vowel shapes
            if ('viseme_aa' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['viseme_aa']] = mouthIntensity * 0.5;
            }
            if ('viseme_E' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['viseme_E']] = mouthIntensity * 0.3;
            }
            if ('viseme_I' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['viseme_I']] = mouthIntensity * 0.2;
            }
            if ('viseme_O' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['viseme_O']] = mouthIntensity * 0.4;
            }
            if ('viseme_U' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['viseme_U']] = mouthIntensity * 0.3;
            }
            
            // Consonant shapes
            if ('viseme_PP' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['viseme_PP']] = mouthIntensity * 0.1;
            }
            if ('viseme_FF' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['viseme_FF']] = mouthIntensity * 0.15;
            }
            if ('viseme_TH' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['viseme_TH']] = mouthIntensity * 0.1;
            }
            
            // Mouth corner movements for more expression
            if ('mouthSmileLeft' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['mouthSmileLeft']] = mouthIntensity * 0.1;
            }
            if ('mouthSmileRight' in morphTargetNames) {
              child.morphTargetInfluences[morphTargetNames['mouthSmileRight']] = mouthIntensity * 0.1;
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
        // Enhanced analyser settings for better lip-sync
        analyserRef.current.fftSize = 512;  // Higher resolution
        analyserRef.current.smoothingTimeConstant = 0.6; // Less smoothing for responsiveness
        analyserRef.current.minDecibels = -90;
        analyserRef.current.maxDecibels = -10;
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
        camera={{ position: [0, 2.8, 2.2], fov: 28 }}
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
