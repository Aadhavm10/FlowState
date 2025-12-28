import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
  Vector2,
  Clock
} from 'three';

const vertexShader = `
precision highp float;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

const vec3 BLACK = vec3(0.0);
const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
const vec3 BLUE  = vec3(47.0,  75.0, 162.0) / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  vec3 col = vec3(0.0);

  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;

  col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.5;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }

  vec3 gradientColor;

  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int idx2 = min(idx + 1, lineGradientCount - 1);

    vec3 c1 = lineGradient[idx];
    vec3 c2 = lineGradient[idx2];

    gradientColor = mix(c1, c2, f);
  }

  return gradientColor * 0.5;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;

  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  return 0.006 / max(abs(m) + 0.01, 1e-3) + 0.008;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;

  if (parallax) {
    baseUv += parallaxOffset;
  }

  vec3 col = vec3(0.0);

  vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }

  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(bottomLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);

      float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.2;
    }
  }

  if (enableMiddle) {
    for (int i = 0; i < middleLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(middleLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);

      float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
        2.0 + 0.15 * fi,
        baseUv,
        mouseUv,
        interactive
      );
    }
  }

  if (enableTop) {
    for (int i = 0; i < topLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(topLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);

      float angle = topWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      ruv.x *= -1.0;
      col += lineCol * wave(
        ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.1;
    }
  }

  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;

const MAX_GRADIENT_STOPS = 8;

type WavePosition = {
  x: number;
  y: number;
  rotate: number;
};

type FloatingLinesOptions = {
  linesGradient?: string[];
  enabledWaves?: Array<'top' | 'middle' | 'bottom'>;
  lineCount?: number | number[];
  lineDistance?: number | number[];
  topWavePosition?: WavePosition;
  middleWavePosition?: WavePosition;
  bottomWavePosition?: WavePosition;
  animationSpeed?: number;
  interactive?: boolean;
  bendRadius?: number;
  bendStrength?: number;
  mouseDamping?: number;
  parallax?: boolean;
  parallaxStrength?: number;
};

function hexToVec3(hex: string): Vector3 {
  let value = hex.trim();

  if (value.startsWith('#')) {
    value = value.slice(1);
  }

  let r = 255;
  let g = 255;
  let b = 255;

  if (value.length === 3) {
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  }

  return new Vector3(r / 255, g / 255, b / 255);
}

export class FloatingLines {
  private container: HTMLElement;
  private scene: Scene;
  private camera: OrthographicCamera;
  private renderer: WebGLRenderer;
  private material: ShaderMaterial;
  private clock: Clock;
  private animationFrameId: number = 0;
  private resizeObserver: ResizeObserver | null = null;

  private targetMouse: Vector2;
  private currentMouse: Vector2;
  private targetInfluence: number = 0;
  private currentInfluence: number = 0;
  private targetParallax: Vector2;
  private currentParallax: Vector2;

  private options: Required<FloatingLinesOptions>;

  constructor(container: HTMLElement, options: FloatingLinesOptions = {}) {
    this.container = container;

    // Set default options
    this.options = {
      linesGradient: options.linesGradient || [],
      enabledWaves: options.enabledWaves || ['top', 'middle', 'bottom'],
      lineCount: options.lineCount ?? 6,
      lineDistance: options.lineDistance ?? 5,
      topWavePosition: options.topWavePosition || { x: 10.0, y: 0.5, rotate: -0.4 },
      middleWavePosition: options.middleWavePosition || { x: 5.0, y: 0.0, rotate: 0.2 },
      bottomWavePosition: options.bottomWavePosition || { x: 2.0, y: -0.7, rotate: -1 },
      animationSpeed: options.animationSpeed ?? 1,
      interactive: options.interactive ?? true,
      bendRadius: options.bendRadius ?? 5.0,
      bendStrength: options.bendStrength ?? -0.5,
      mouseDamping: options.mouseDamping ?? 0.05,
      parallax: options.parallax ?? true,
      parallaxStrength: options.parallaxStrength ?? 0.2
    };

    this.targetMouse = new Vector2(-1000, -1000);
    this.currentMouse = new Vector2(-1000, -1000);
    this.targetParallax = new Vector2(0, 0);
    this.currentParallax = new Vector2(0, 0);

    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.camera.position.z = 1;

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0); // Transparent background
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '-1'; // Behind all content

    this.clock = new Clock();

    // Setup uniforms
    const uniforms = this.createUniforms();
    this.material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader
    });

    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, this.material);
    this.scene.add(mesh);

    this.container.appendChild(this.renderer.domElement);

    this.setupSize();
    this.setupEventListeners();
    this.startAnimation();
  }

  private getLineCount(waveType: 'top' | 'middle' | 'bottom'): number {
    if (typeof this.options.lineCount === 'number') return this.options.lineCount;
    if (!this.options.enabledWaves.includes(waveType)) return 0;
    const index = this.options.enabledWaves.indexOf(waveType);
    return this.options.lineCount[index] ?? 6;
  }

  private getLineDistance(waveType: 'top' | 'middle' | 'bottom'): number {
    if (typeof this.options.lineDistance === 'number') return this.options.lineDistance;
    if (!this.options.enabledWaves.includes(waveType)) return 0.1;
    const index = this.options.enabledWaves.indexOf(waveType);
    return this.options.lineDistance[index] ?? 0.1;
  }

  private createUniforms() {
    const topLineCount = this.options.enabledWaves.includes('top') ? this.getLineCount('top') : 0;
    const middleLineCount = this.options.enabledWaves.includes('middle') ? this.getLineCount('middle') : 0;
    const bottomLineCount = this.options.enabledWaves.includes('bottom') ? this.getLineCount('bottom') : 0;

    const topLineDistance = this.options.enabledWaves.includes('top') ? this.getLineDistance('top') * 0.01 : 0.01;
    const middleLineDistance = this.options.enabledWaves.includes('middle') ? this.getLineDistance('middle') * 0.01 : 0.01;
    const bottomLineDistance = this.options.enabledWaves.includes('bottom') ? this.getLineDistance('bottom') * 0.01 : 0.01;

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: this.options.animationSpeed },

      enableTop: { value: this.options.enabledWaves.includes('top') },
      enableMiddle: { value: this.options.enabledWaves.includes('middle') },
      enableBottom: { value: this.options.enabledWaves.includes('bottom') },

      topLineCount: { value: topLineCount },
      middleLineCount: { value: middleLineCount },
      bottomLineCount: { value: bottomLineCount },

      topLineDistance: { value: topLineDistance },
      middleLineDistance: { value: middleLineDistance },
      bottomLineDistance: { value: bottomLineDistance },

      topWavePosition: {
        value: new Vector3(
          this.options.topWavePosition.x,
          this.options.topWavePosition.y,
          this.options.topWavePosition.rotate
        )
      },
      middleWavePosition: {
        value: new Vector3(
          this.options.middleWavePosition.x,
          this.options.middleWavePosition.y,
          this.options.middleWavePosition.rotate
        )
      },
      bottomWavePosition: {
        value: new Vector3(
          this.options.bottomWavePosition.x,
          this.options.bottomWavePosition.y,
          this.options.bottomWavePosition.rotate
        )
      },

      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: this.options.interactive },
      bendRadius: { value: this.options.bendRadius },
      bendStrength: { value: this.options.bendStrength },
      bendInfluence: { value: 0 },

      parallax: { value: this.options.parallax },
      parallaxStrength: { value: this.options.parallaxStrength },
      parallaxOffset: { value: new Vector2(0, 0) },

      lineGradient: {
        value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1))
      },
      lineGradientCount: { value: 0 }
    };

    if (this.options.linesGradient && this.options.linesGradient.length > 0) {
      const stops = this.options.linesGradient.slice(0, MAX_GRADIENT_STOPS);
      uniforms.lineGradientCount.value = stops.length;

      stops.forEach((hex, i) => {
        const color = hexToVec3(hex);
        uniforms.lineGradient.value[i].set(color.x, color.y, color.z);
      });
    }

    return uniforms;
  }

  private setupSize = () => {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;

    this.renderer.setSize(width, height, false);

    const canvasWidth = this.renderer.domElement.width;
    const canvasHeight = this.renderer.domElement.height;
    this.material.uniforms.iResolution.value.set(canvasWidth, canvasHeight, 1);
  };

  private handlePointerMove = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dpr = this.renderer.getPixelRatio();

    this.targetMouse.set(x * dpr, (rect.height - y) * dpr);
    this.targetInfluence = 1.0;

    if (this.options.parallax) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const offsetX = (x - centerX) / rect.width;
      const offsetY = -(y - centerY) / rect.height;
      this.targetParallax.set(offsetX * this.options.parallaxStrength, offsetY * this.options.parallaxStrength);
    }
  };

  private handlePointerLeave = () => {
    this.targetInfluence = 0.0;
  };

  private setupEventListeners() {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.setupSize);
      this.resizeObserver.observe(this.container);
    }

    if (this.options.interactive) {
      // Track mouse on container instead of canvas since canvas is behind content
      this.container.addEventListener('pointermove', this.handlePointerMove);
      this.container.addEventListener('pointerleave', this.handlePointerLeave);
    }
  }

  private animate = () => {
    this.material.uniforms.iTime.value = this.clock.getElapsedTime();

    if (this.options.interactive) {
      this.currentMouse.lerp(this.targetMouse, this.options.mouseDamping);
      this.material.uniforms.iMouse.value.copy(this.currentMouse);

      this.currentInfluence += (this.targetInfluence - this.currentInfluence) * this.options.mouseDamping;
      this.material.uniforms.bendInfluence.value = this.currentInfluence;
    }

    if (this.options.parallax) {
      this.currentParallax.lerp(this.targetParallax, this.options.mouseDamping);
      this.material.uniforms.parallaxOffset.value.copy(this.currentParallax);
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private startAnimation() {
    this.animate();
  }

  destroy() {
    cancelAnimationFrame(this.animationFrameId);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.options.interactive) {
      this.container.removeEventListener('pointermove', this.handlePointerMove);
      this.container.removeEventListener('pointerleave', this.handlePointerLeave);
    }

    this.material.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
