// Post-processing: bloom on the bright things (torches, windows, the rift, the gods) and a final
// grade with a soft vignette and a little film grain. On "low" quality it is skipped entirely and
// the scene renders straight to the screen.
import * as THREE from 'three';
import { EffectComposer } from '../vendor/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from '../vendor/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from '../vendor/jsm/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.42 }, time: { value: 0 }, grain: { value: 0.018 }, rage: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float vignette, time, grain, rage; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      c.rgb *= clamp(1.0 - dot(d, d) * vignette * 2.4, 0.0, 1.0);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      // cool moonlit shadows, warm firelit highlights
      c.rgb = mix(c.rgb * vec3(0.9, 0.97, 1.1), c.rgb * vec3(1.06, 1.0, 0.92), smoothstep(0.04, 0.5, l));
      c.rgb = mix(c.rgb, c.rgb * vec3(1.12, 0.86, 0.78), rage * 0.5);
      c.rgb += (hash(vUv * 1733.0 + fract(time) * 91.0) - 0.5) * grain * (0.25 + l);
      gl_FragColor = c;
    }`,
};

export function createPost(renderer, scene, camera) {
  let composer = null, bloom = null, grade = null, samples = -1;
  const size = new THREE.Vector2();
  function build(msaa) {
    if (composer && samples === msaa) return;
    if (composer) composer.dispose();
    samples = msaa;
    renderer.getSize(size);
    const pr = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: msaa });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.5, 0.82);
    composer.addPass(bloom);
    grade = new ShaderPass(GradeShader);
    composer.addPass(grade);
    composer.addPass(new OutputPass());
    composer.setPixelRatio(pr); composer.setSize(size.x, size.y);
  }
  const post = {
    enabled: true,
    setQuality(q) {
      post.enabled = q !== 'low';
      if (post.enabled) build(q === 'high' ? 4 : 0);
      if (bloom) bloom.strength = q === 'high' ? 0.6 : 0.5;
    },
    resize(w, h) { if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } },
    render(dt, rage = 0) {
      if (!post.enabled) { renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera); return; }
      grade.uniforms.time.value += dt;
      grade.uniforms.rage.value = rage;
      composer.render(dt);
    },
  };
  return post;
}
