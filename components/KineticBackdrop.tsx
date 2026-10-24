'use client';

import {useEffect, useRef} from 'react';
import type {MeshPhysicalMaterial, WebGLRenderer} from 'three';
import styles from './KineticBackdrop.module.css';

type Props = {motion: boolean; view: string};

/** Decorative presentation only: never reads or changes the workspace's application state. */
export default function KineticBackdrop({motion, view}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({motion, view});
  const refreshRef = useRef<(() => void) | null>(null);
  propsRef.current = {motion, view};

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let renderer: WebGLRenderer | undefined;
    const resources = new Set<{dispose(): void}>();
    let frame = 0;
    let previous = 0;
    let time = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let compact = width < 760;
    let pointerX = 0;
    let pointerY = 0;
    let smoothedX = 0;
    let smoothedY = 0;
    let draw: ((delta: number) => void) | undefined;
    let resizeScene: (() => void) | undefined;
    let contextLost = false;
    let layoutDirty = true;
    let cachedLayout: {bounds: DOMRect | undefined; heroFraction: number; centerX: number; centerY: number; size: number} | undefined;
    let observedHero: HTMLElement | null = null;
    const heroObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      layoutDirty = true;
      if (!allowed() && !document.hidden && !contextLost) draw?.(0);
    });

    function own<T extends {dispose(): void}>(resource: T): T { resources.add(resource); return resource; }
    function release(resource: {dispose(): void}) { resource.dispose(); resources.delete(resource); }
    function releaseResources() { for (const resource of resources) resource.dispose(); resources.clear(); }
    function releaseRenderer() {
      const current = renderer;
      renderer = undefined;
      draw = resizeScene = undefined;
      current?.domElement.removeEventListener('webglcontextlost', lost);
      current?.domElement.removeEventListener('webglcontextrestored', restored);
      current?.dispose();
      current?.forceContextLoss();
      current?.domElement.remove();
    }

    const allowed = () => !disposed && propsRef.current.motion && !reduced.matches && !document.hidden;
    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    }
    function tick(now: number) {
      frame = 0;
      if (!allowed() || contextLost) return;
      const delta = previous ? Math.min(now - previous, 80) : 0;
      // A mobile frame is only painted at 30 Hz; there is no extra renderer or postprocessing pass.
      if (compact && previous && delta < 32) {
        frame = requestAnimationFrame(tick);
        return;
      }
      previous = now;
      time += delta / 1000;
      draw?.(delta);
      frame = requestAnimationFrame(tick);
    }
    function layoutFallback() {
      if (!layoutDirty && cachedLayout) return cachedLayout;
      layoutDirty = false;
      const hero = host!.parentElement?.querySelector<HTMLElement>('[data-kinetic-hero]') || null;
      if (hero !== observedHero) {
        heroObserver?.disconnect();
        observedHero = hero;
        if (hero) heroObserver?.observe(hero);
      }
      const bounds = hero?.getBoundingClientRect();
      const heroFraction = bounds ? Math.max(0, Math.min(1, (bounds.bottom - 150) / Math.max(bounds.height, 1))) : 0;
      const progress = bounds ? 1 - heroFraction : 1;
      const heroX = bounds ? bounds.left + bounds.width * (compact ? .5 : .76) : width * .86;
      const heroY = bounds ? bounds.top + bounds.height * (compact ? .72 : .48) : height * .44;
      // Both renderers use the same scroll composition, including the quiet edge placement.
      const centerX = heroX * (1 - progress) + width * (compact ? .92 : .96) * progress;
      const centerY = heroY * (1 - progress) + height * .48 * progress;
      const size = (compact ? Math.min(width * .93, 430) : Math.min(width * .46, 730)) * (1 - progress * .2);
      host!.style.setProperty('--sculpture-x', `${centerX}px`);
      host!.style.setProperty('--sculpture-y', `${centerY}px`);
      host!.style.setProperty('--sculpture-size', `${size}px`);
      host!.style.setProperty('--sculpture-presence', String(bounds ? 1 - progress * .82 : .15));
      cachedLayout = {bounds, heroFraction, centerX, centerY, size};
      return cachedLayout;
    }
    function reconcile() {
      stop();
      const active = allowed();
      host!.dataset.motion = active ? 'active' : 'paused';
      layoutDirty = true;
      layoutFallback();
      if (!active) smoothedX = smoothedY = pointerX = pointerY = 0;
      // Keep the static composition available with reduced motion or a paused workspace.
      if (!document.hidden && !contextLost) draw?.(0);
      if (active && draw && !contextLost) frame = requestAnimationFrame(tick);
    }
    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      compact = width < 760;
      layoutDirty = true;
      layoutFallback();
      resizeScene?.();
      if (!document.hidden && !contextLost) draw?.(0);
    }
    function pointer(event: PointerEvent) {
      if (!allowed() || event.pointerType === 'touch') return;
      pointerX = (event.clientX / Math.max(width, 1) - .5) * 2;
      pointerY = (event.clientY / Math.max(height, 1) - .5) * 2;
    }
    function leave() { pointerX = pointerY = 0; }
    function scroll() {
      // The renderer batches layout reads into its next frame, rather than doing them every frame.
      layoutDirty = true;
      if (allowed() && (!draw || contextLost)) layoutFallback();
    }
    function lost(event: Event) {
      event.preventDefault();
      contextLost = true;
      host!.dataset.renderer = 'fallback';
      if (renderer) renderer.domElement.style.opacity = '0';
      stop();
    }
    function restored() {
      contextLost = false;
      host!.dataset.renderer = 'webgl';
      reconcile();
    }

    refreshRef.current = reconcile;
    window.addEventListener('resize', resize, {passive: true});
    window.addEventListener('scroll', scroll, {passive: true});
    window.addEventListener('pointermove', pointer, {passive: true});
    document.documentElement.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', reconcile);
    reduced.addEventListener('change', reconcile);
    layoutFallback();
    reconcile();

    void import('three').then(THREE => {
      if (disposed) return;
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, .1, 3000);
      camera.position.z = 1000;
      renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.className = styles.canvas;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.dataset.renderer = 'webgl';
      renderer.domElement.addEventListener('webglcontextlost', lost);
      renderer.domElement.addEventListener('webglcontextrestored', restored);
      host.appendChild(renderer.domElement);

      // A small procedural studio environment gives the metal readable soft-box reflections.
      // It is authored at runtime and requires no downloaded image or external resource.
      const studio = document.createElement('canvas');
      studio.width = 1024;
      studio.height = 512;
      const context = studio.getContext('2d');
      if (context) {
        context.fillStyle = '#6977a0';
        context.fillRect(0, 0, 1024, 512);
        const wash = context.createLinearGradient(0, 0, 0, 512);
        wash.addColorStop(0, '#f7fbff');
        wash.addColorStop(.45, '#b3b8d4');
        wash.addColorStop(.6, '#38405e');
        wash.addColorStop(1, '#b5c6d4');
        context.fillStyle = wash;
        context.fillRect(0, 0, 1024, 512);
        context.fillStyle = '#ffffff';
        context.fillRect(80, 20, 210, 340);
        context.fillRect(600, 45, 90, 280);
        context.fillStyle = '#d9cfff';
        context.fillRect(820, 50, 130, 330);
        context.fillStyle = '#b6f5ec';
        context.fillRect(400, 250, 100, 200);
        const texture = own(new THREE.CanvasTexture(studio));
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        const generator = own(new THREE.PMREMGenerator(renderer));
        const environment = own(generator.fromEquirectangular(texture));
        scene.environment = environment.texture;
        release(generator);
        release(texture);
      }
      scene.add(new THREE.HemisphereLight(0xf3f6ff, 0x555f8b, 2.4));
      const key = new THREE.DirectionalLight(0xffffff, 4.5);
      key.position.set(-3, 5, 7);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xb9a6fa, 2.5);
      rim.position.set(5, -2, 3);
      scene.add(rim);

      function ribbon(radius: number, band: number, thickness: number, twist: number) {
        const segments = compact ? 128 : 192;
        const crossSegments = 16;
        const positions: number[] = [];
        const indices: number[] = [];
        for (let i = 0; i <= segments; i++) {
          const u = i / segments * Math.PI * 2;
          const c = Math.cos(u), s = Math.sin(u);
          const turn = u * twist + .5;
          for (let j = 0; j <= crossSegments; j++) {
            const v = j / crossSegments * Math.PI * 2;
            const across = Math.cos(v) * band;
            const depth = Math.sin(v) * thickness;
            const radial = across * Math.cos(turn) - depth * Math.sin(turn);
            const z = across * Math.sin(turn) + depth * Math.cos(turn);
            const r = radius + .11 * Math.cos(3 * u);
            positions.push(c * (r + radial), s * (r + radial) * .93, z + .24 * Math.sin(2 * u));
            if (i < segments && j < crossSegments) {
              const a = i * (crossSegments + 1) + j;
              const b = a + crossSegments + 1;
              indices.push(a, b, a + 1, b, b + 1, a + 1);
            }
          }
        }
        const geometry = own(new THREE.BufferGeometry());
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
      }

      const sculpture = new THREE.Group();
      scene.add(sculpture);
      const silver = own(new THREE.MeshPhysicalMaterial({color: 0xd9e5f7, metalness: .92, roughness: .21, clearcoat: 1, clearcoatRoughness: .13, iridescence: .35, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 340]}));
      const lilac = own(new THREE.MeshPhysicalMaterial({color: 0xbdbcf4, metalness: .84, roughness: .24, clearcoat: 1, clearcoatRoughness: .16, iridescence: .2}));
      const cobalt = own(new THREE.MeshPhysicalMaterial({color: 0x5363c7, metalness: .72, roughness: .23, clearcoat: .8}));
      const timeUniform = {value: 0};
      for (const material of [silver, lilac] as MeshPhysicalMaterial[]) {
        material.onBeforeCompile = shader => {
          shader.uniforms.kineticTime = timeUniform;
          shader.vertexShader = 'uniform float kineticTime;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += sin(position.x * 1.7 + kineticTime * .52) * .065;\ntransformed.xy *= 1.0 + sin(position.z * 2.0 + kineticTime * .39) * .018;');
        };
      }
      const mainGeometry = ribbon(2.08, .49, .075, 1);
      const innerGeometry = ribbon(1.83, .29, .065, 1);
      const orbitGeometry = own(new THREE.TorusGeometry(2.68, .023, 8, 160));
      const main = new THREE.Mesh(mainGeometry, silver);
      const inner = new THREE.Mesh(innerGeometry, lilac);
      const orbit = new THREE.Mesh(orbitGeometry, cobalt);
      main.rotation.set(.25, -.4, -.36);
      inner.rotation.set(1.22, .58, .55);
      orbit.rotation.set(.96, -.32, -.18);
      sculpture.add(main, inner, orbit);

      let smoothCenterX = width * .75;
      let smoothCenterY = height * .47;
      let smoothScale = 1;
      function render(delta: number) {
        if (!renderer || contextLost || disposed) return;
        const layout = layoutFallback();
        const hasHero = !!layout.bounds;
        const progress = hasHero ? 1 - layout.heroFraction : 1;
        const ease = delta ? 1 - Math.exp(-delta / 420) : 1;
        const pointerEase = delta ? 1 - Math.exp(-delta / 280) : 1;
        smoothedX += (pointerX - smoothedX) * pointerEase;
        smoothedY += (pointerY - smoothedY) * pointerEase;
        // Once the hero leaves, the form becomes a quiet travelling presence at the page edge.
        const targetX = layout.centerX;
        const targetY = layout.centerY;
        smoothCenterX += (targetX - smoothCenterX) * ease;
        smoothCenterY += (targetY - smoothCenterY) * ease;
        const targetScale = layout.size / 5.7;
        smoothScale += (targetScale - smoothScale) * ease;
        sculpture.position.set(smoothCenterX - width / 2 + smoothedX * 13, height / 2 - smoothCenterY - smoothedY * 10, 0);
        sculpture.scale.setScalar(smoothScale);
        sculpture.rotation.set(.1 + smoothedY * .1, -.15 + smoothedX * .13 + Math.sin(time * .18) * .1, -.16 + Math.sin(time * .13) * .1 + progress * .65);
        main.rotation.z = -.36 + time * .035;
        inner.rotation.z = .55 - time * .055;
        orbit.rotation.y = -.32 + Math.sin(time * .19) * .17;
        timeUniform.value = time;
        // A CSS opacity transition never changes geometry or the position of clickable content.
        const presence = (hasHero ? 1 - progress * .82 : .15);
        const opacity = String(presence);
        if (renderer.domElement.style.opacity !== opacity) renderer.domElement.style.opacity = opacity;
        renderer.render(scene, camera);
      }
      draw = render;
      resizeScene = () => {
        if (!renderer) return;
        camera.left = -width / 2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = -height / 2;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5));
        renderer.setSize(width, height);
      };
      host.dataset.renderer = 'webgl';
      reconcile();
    }).catch(() => {
      if (disposed) return;
      contextLost = true;
      host.dataset.renderer = 'fallback';
      stop();
      releaseResources();
      releaseRenderer();
    });

    return () => {
      disposed = true;
      stop();
      refreshRef.current = null;
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('pointermove', pointer);
      document.documentElement.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', reconcile);
      reduced.removeEventListener('change', reconcile);
      heroObserver?.disconnect();
      releaseResources();
      releaseRenderer();
    };
  }, []);

  useEffect(() => { refreshRef.current?.(); }, [motion, view]);

  return <div ref={hostRef} className={styles.field} data-renderer="fallback" data-motion="paused" aria-hidden="true">
    <div className={styles.wash}/>
    <div className={styles.reflection}/>
    <div className={styles.fallback}><i/><i/><i/></div>
  </div>;
}
