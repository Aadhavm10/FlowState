#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
varying float amplitude;
varying vec2 vertexUV;
varying vec3 vertexNormal;

varying float x;
varying float y;
varying float z;

void main() {
  float intensity = smoothstep(1., 0., z/amplitude);

  gl_FragColor = vec4(.01, .0, .1, .2);
  if (intensity > .3) {
    gl_FragColor = vec4(intensity/12., intensity/15., 1.-min(intensity, 0.6), .3);
  }

  if (intensity > .8) {
    gl_FragColor = vec4(.3, .1, .8, .2);
  }

  if (intensity > .9999) {
    gl_FragColor = vec4(.0, .2, .6, .2);
  }
}