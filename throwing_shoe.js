window.onload = function () {
/*
Basic idea:
- user can position mouse to aim the horseshoe
- user can scroll the mouse wheel back to adjust the height of the throw
- user then scrolls the mouse wheel forward, and the "velocity" of the throw is calculated
- the throw is then simulated and the distance between the horseshoe's landing position and the target pole is calculated
- if the distance is within a certain threshold it is a "ringer" (3 points i think?)
- if it is within one horseshoe width, it is a point
- each player throws 3 shoes and the highest score wins the round
 */

var { mat2, mat3, mat4, vec2, vec3, vec4 } = glMatrix;

var last_timestamp = performance.now();
var quit = false;
var canvas = document.getElementById("stage");
var ctx = canvas.getContext("2d");

var frame = 0;

var gravity = 9.8;
var position = vec3.fromValues(-0.5,1,5);
var new_position = vec3.create();
var velocity = vec3.fromValues(0.5, -10, 6);

var modelview = mat4.create();
var projection = mat4.create();


function draw_cube(front_top_left, side) {
  var front_top_right = vec3.create();
  var front_bottom_right = vec3.create();
  var front_bottom_left = vec3.create();
  var back_top_left = vec3.create();
  var back_top_right = vec3.create();
  var back_bottom_right = vec3.create();
  var back_bottom_left = vec3.create();

  vec3.add(front_top_right, front_top_left, [side, 0, 0]);
  vec3.add(front_bottom_right, front_top_left, [side, side, 0]);
  vec3.add(front_bottom_left, front_top_left, [0, side, 0]);

  vec3.add(back_top_left, front_top_left, [0, 0, side]);
  vec3.add(back_top_right, front_top_right, [0, 0, side]);
  vec3.add(back_bottom_right, front_bottom_right, [0, 0, side]);
  vec3.add(back_bottom_left, front_bottom_left, [0, 0, side]);

  front_top_left = to_canvas_coords(front_top_left);
  front_top_right = to_canvas_coords(front_top_right);
  front_bottom_left = to_canvas_coords(front_bottom_left);
  front_bottom_right = to_canvas_coords(front_bottom_right);
  back_top_left = to_canvas_coords(back_top_left);
  back_top_right = to_canvas_coords(back_top_right);
  back_bottom_left = to_canvas_coords(back_bottom_left);
  back_bottom_right = to_canvas_coords(back_bottom_right);

  //console.log(front_top_left);
  //console.log(front_top_right);
  //console.log(front_bottom_right);
  //console.log(front_bottom_left);
  //console.log(back_top_left);
  //console.log(back_top_right);
  //console.log(back_bottom_right);
  //console.log(back_bottom_left);

  ctx.strokeStyle = 'blue';

  ctx.beginPath();
  ctx.moveTo(front_top_left[0], front_top_left[1])
  ctx.lineTo(front_top_right[0], front_top_right[1])
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(front_top_right[0], front_top_right[1])
  ctx.lineTo(front_bottom_right[0], front_bottom_right[1])
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(front_bottom_right[0], front_bottom_right[1])
  ctx.lineTo(front_bottom_left[0], front_bottom_left[1])
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(front_bottom_left[0], front_bottom_left[1])
  ctx.lineTo(front_top_left[0], front_top_left[1])
  ctx.stroke();

  ctx.strokeStyle = 'green'

  ctx.beginPath();
  ctx.moveTo(front_top_left[0], front_top_left[1])
  ctx.lineTo(back_top_left[0], back_top_left[1])
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(front_top_right[0], front_top_right[1])
  ctx.lineTo(back_top_right[0], back_top_right[1])
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(front_bottom_right[0], front_bottom_right[1])
  ctx.lineTo(back_bottom_right[0], back_bottom_right[1])
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(front_bottom_left[0], front_bottom_left[1])
  ctx.lineTo(back_bottom_left[0], back_bottom_left[1])
  ctx.stroke();


  ctx.strokeStyle = 'red';

  ctx.beginPath();
  ctx.moveTo(back_top_left[0], back_top_left[1])
  ctx.lineTo(back_top_right[0], back_top_right[1])
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(back_top_right[0], back_top_right[1])
  ctx.lineTo(back_bottom_right[0], back_bottom_right[1])
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(back_bottom_right[0], back_bottom_right[1])
  ctx.lineTo(back_bottom_left[0], back_bottom_left[1])
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(back_bottom_left[0], back_bottom_left[1])
  ctx.lineTo(back_top_left[0], back_top_left[1])
  ctx.stroke();
}

function simulate(dt) {
  //
  // UPDATE
  //

  // update velocity by acceleration
  vec3.add(velocity, velocity, [0, gravity*dt, 0]);
  
  // update position by velocity
  vec3.scaleAndAdd(new_position, position, velocity, dt);

  // if grounded, set y position to 0
  var ground_height = 4;
  if (new_position[1] >= ground_height)
    vec3.set(new_position, new_position[0], ground_height, new_position[2]);

  // commit position change
  vec3.copy(position, new_position);

  //
  // DRAW
  //
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw_grid();
  var coords = to_canvas_coords(position);
  ctx.fillRect(coords[0], coords[1], 10, 10);

  //console.log(position);
  //var front_top_left = vec3.fromValues(-0.5, 0, 5);
  //draw_cube(front_top_left, 1);
}

//function to_canvas_coords(v3) {
  //var v4 = vec4.fromValues(v3[0], v3[1], v3[2], 1);
  //var canvas_coords = vec4.create();

  //vec4.transformMat4(canvas_coords, v4, modelview);

  //return canvas_coords;
//}

function to_canvas_coords(v3) {
  var canvas_coords = vec2.create();

  // world to camera space coords
  var coords = vec4.fromValues(v3[0], v3[1], v3[2], 1);
  vec4.transformMat4(coords, coords, modelview);

  //console.log('camera space: ', coords);

  // perspective projection
  vec4.transformMat4(coords, coords, projection);

  //console.log('perspective projection: ', coords);

  // perspective divide
  vec4.div(coords, coords, [coords[3], coords[3], coords[3], 1]);

  //console.log('perspective divide: ', coords);

  // viewport transform
  canvas_coords[0] = (coords[0] + 1) * 0.5 * canvas.width;
  canvas_coords[1] = (1 - (coords[1] + 1) * 0.5) * canvas.height;

  return canvas_coords;
}


var grid_lines = [
  // vertical
  [vec3.fromValues(-5,4,5), vec3.fromValues(-5,4,20)],
  [vec3.fromValues(5,4,5), vec3.fromValues(5,4,20)],
  // horizontal
  [vec3.fromValues(-5,4,5), vec3.fromValues(5,4,5)],
  [vec3.fromValues(-5,4,10), vec3.fromValues(5,4,10)],
  [vec3.fromValues(-5,4,15), vec3.fromValues(5,4,15)],
  [vec3.fromValues(-5,4,20), vec3.fromValues(5,4,20)],
]

console.log(grid_lines);

function draw_grid() {
  var line, a, b;
  ctx.strokeStyle = 'black';
  for (var i=0; i<grid_lines.length; i++) {
    line = grid_lines[i];
    a = to_canvas_coords(line[0]);
    b = to_canvas_coords(line[1]);

    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}

function resize_canvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

function set_projection_matrix(matrix, aspect, fov_degrees, near, far) {
  var scale = Math.tan(fov_degrees * 0.5 * Math.PI / 180) * near;
  var r = aspect * scale;
  var l = -r;
  var t = scale;
  var b = -t;

  matrix[0] = 2 * near / (r - l);
  matrix[1] = 0;
  matrix[2] = 0;
  matrix[3] = 0;

  matrix[4] = 0;
  matrix[5] = 2 * near / (t - b);
  matrix[6] = 0;
  matrix[7] = 0;

  matrix[8] = (r + l) / (r - l);
  matrix[9] = (t + b) / (t - b);
  matrix[10] = -(far + near) / (far - near);
  matrix[11] = -1;

  matrix[12] = 0;
  matrix[13] = 0;
  matrix[14] = -2 * far * near / (far - near);
  matrix[15] = 0;
}

function loop(timestamp) {
  var dt = 0.001 * (timestamp - last_timestamp);
  last_timestamp = timestamp;

  
  simulate(dt);

  frame++; 
  if (frame > 10000)
    quit = true;

  if (!quit) {
    requestAnimationFrame(loop);
  }
}


function run() {
  last_timestamp = performance.now();

  resize_canvas();

  // create perspective projection matrix
  //var fovy_radians = 75 * Math.PI / 180;
  //var aspect = canvas.width / canvas.height;
  //var near = 0;
  //var far = 100;
  //mat4.perspective(projection, fovy_radians, aspect, near, far);

  var aspect = canvas.width / canvas.height;
  var fov_degrees = 90;
  var near = 0.1;
  var far = 100;
  set_projection_matrix(projection, aspect, fov_degrees, near, far);

  // transform from world coords to camera coords
  mat4.fromTranslation(modelview, [0, 1, 0]);
  //mat4.rotateX(modelview, modelview, 0.15);
  //mat4.rotateY(modelview, modelview, 0.15);

  // apply perspective projection
  //mat4.mul(modelview, projection, modelview);
  //var ndc_to_canvas = vec4.fromValues(1.6, .9, 1, 1);
  //vec4.mul(modelview, modelview, ndc_to_canvas);

  requestAnimationFrame(loop);
}

run();




};
