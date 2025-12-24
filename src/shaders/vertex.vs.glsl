varying vec2 vertexUV;
varying vec3 vertexNormal;

varying float x;
varying float y;
varying float z;
varying vec3 vUv;
varying float amplitude;

uniform float u_time;
uniform float u_amplitude;
uniform float[64] u_data_arr;

void main() {
  vUv = position;

  amplitude = u_amplitude;
  x = abs(position.x);
  y = abs(position.y);

  float floor_x = round(x);
  float floor_y = round(y);

  float x_multiplier = (48.0 - x) / 4.0;
  float y_multiplier = (48.0 - y) / 4.0;

  z = sin(u_data_arr[int(floor_x)] / 48.0 + u_data_arr[int(floor_y)] / 48.0) * u_amplitude;

  gl_PointSize = clamp(pow(floor(z*2.-1.), 2.)/4., 2., 7.);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, position.y, z, 1.0);
}