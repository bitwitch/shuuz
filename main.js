window.onload = function () {

var { mat2, mat3, mat4, vec2, vec3, vec4 } = glMatrix;

// globals
var game_states = {
  // outer game states
  "START_MENU": 0,
  "CHARACTER_SELECT": 1,
  "GAME": 2,

  // inner game states
  "NEW_ROUND": 3,
  "HORIZONTAL_POSITION": 4,
  "ANGLE_SELECT": 5,
  "THROWING": 6
}

var gravity = 9;

var fov_degrees = 70;
var near = 0.1;
var modelview = mat4.create();
var projection = mat4.create();

var game_state = game_states.CHARACTER_SELECT;
var turn_state = game_states.NEW_ROUND;
//var turn_state = game_states.ANGLE_SELECT;

var last_timestep = performance.now();
var quit = false;

var start_menu = {
  active_button: 0,
  buttons: []
}

var ui_state = { 
  "arc_fill": {
    "width": 0,
    "height_max": 0,
    "left": 0,
    "bottom": 0,
    "fill_max": 0, 
    "fill_amount": 0
  }
}

// order must match order of character_select.images
// joe, al, sid, lefty
var characters = [];

var character_select = {
  select_player_height: 0,
  images: [],
  active_character: 0,
  player_id: 0
};

var players = [
  { character_id: 0, x: 0, y: 0, score: 0, shoes_left: 0, active: false },
  { character_id: 0, x: 0, y: 0, score: 0, shoes_left: 0, active: false }
];

var active_horseshoe = 0;
var horseshoes = [
  { position: vec3.create(), velocity: vec3.create(), rotation: vec3.create() },
  { position: vec3.create(), velocity: vec3.create(), rotation: vec3.create() },
  { position: vec3.create(), velocity: vec3.create(), rotation: vec3.create() },
  { position: vec3.create(), velocity: vec3.create(), rotation: vec3.create() }
];

var round_girl = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  speed: 0,
  image: round_girl_sprite
};

var input = {
  mouse: { 
    x: 0, y: 0,
    button_left:  { is_down: false, pressed: false, was_down: false },
    button_right: { is_down: false, pressed: false, was_down: false },
    wheel_delta: 0
  },
  key: {
    up:     { is_down: false, pressed: false, was_down: false },
    down:   { is_down: false, pressed: false, was_down: false },
    left:   { is_down: false, pressed: false, was_down: false },
    right:  { is_down: false, pressed: false, was_down: false },
    enter:  { is_down: false, pressed: false, was_down: false },
    escape: { is_down: false, pressed: false, was_down: false }
  },
};

var canvas = document.getElementById("stage");
var ctx = canvas.getContext("2d");

var ui_canvas = document.getElementById("ui");
var ui_ctx = ui_canvas.getContext("2d");


// main loop
function loop(timestamp) {
  update_inputs();

  var dt = (timestamp - last_timestamp) * 0.001;
  last_timestamp = timestamp;

  if (game_state == game_states.START_MENU)
    start_menu_loop(dt);
  else if (game_state == game_states.CHARACTER_SELECT)
    character_select_loop(dt);
  else
    simulate(dt);

  // clear mouse wheel delta
  input.mouse.wheel_delta = 0;

  if (!quit) {
    requestAnimationFrame(loop);
  }
}

function run() {
  init();
  last_timestamp = performance.now();
  requestAnimationFrame(loop);
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

function set_view_matrix(matrix) {
  mat4.fromTranslation(matrix, [0, 2, 2.9]);
  mat4.rotateX(matrix, matrix, 0.41);
  var s = 2.2;
  mat4.scale(matrix, matrix, [s,s,s*.9]);
}

function init() {
  resize_canvas(canvas);

  var aspect = canvas.width / canvas.height;
  var far = 100;
  set_projection_matrix(projection, aspect, fov_degrees, near, far);

  set_view_matrix(modelview);

  // init start menu buttons
  ctx.font = "bold 48px Arial";
  var button_y = canvas.height/2;
  var button_height = 40;
  var button_padding = 20;
  var texts = ["1 PLAYER", "2 PLAYER LOCAL", "2 PLAYER ONLINE", "OPTIONS"];
  var text;

  for (var i=0; i<texts.length; i++) {
    text = texts[i];
    start_menu.buttons.push({
      "text": text,
      "x": canvas.width/2 - ctx.measureText(text).width/2,
      "y": button_y,
      "width": ctx.measureText(text).width,
      "height": button_height
    });
    button_y += button_height + button_padding;
  }

  ui_reset();

  init_entities();

  init_character_select();

  reset_round_girl();

  reset_horseshoes();

  // add event listeners
  canvas.addEventListener("mousemove", handle_mousemove);
  canvas.addEventListener("mousedown", handle_mousedown);
  canvas.addEventListener("mouseup", handle_mouseup);
  document.addEventListener("wheel", handle_wheel, {passive: false});
  document.addEventListener("keydown", handle_keydown);
  document.addEventListener("keyup", handle_keyup);
}

// handle input
function handle_mousemove(e) {
  e.preventDefault();
  input.mouse.x = e.offsetX;
  input.mouse.y = e.offsetY;
  return false;
}

function handle_mousedown(e) {
  e.preventDefault();

  var button;
  switch (e.button) {
    case 0:
      button = input.mouse.button_left;
      break;
    case 2:
      button = input.mouse.button_right;
      break;
    default:
      return false;
  }

  button.is_down = true;
  return false;
}

function handle_mouseup(e) {
  e.preventDefault();

  switch (e.button) {
    case 0:
      input.mouse.button_left.is_down = false;
      break;
    case 2:
      input.mouse.button_right.is_down = false;
      break;
    default:
      return false;
  }
  return false;
}

function handle_keydown(e) {
  e.preventDefault();

  var key = null;
  switch (e.key) {
  case "ArrowUp":
      key = input.key.up;
      break;
  case "ArrowDown":
      key = input.key.down;
      break;
  case "ArrowLeft":
      key = input.key.left;
      break;
  case "ArrowRight":
      key = input.key.right;
      break;
  case "Enter":
      key = input.key.enter;
      break;
  case "Escape":
      key = input.key.escape;
      break;
  default: 
      return false;
  }

  key.is_down = true;
  return false;
}

function handle_keyup(e) {
  e.preventDefault();

  var key = null;

  switch (e.key) {
  case "ArrowUp":
      key = input.key.up;
      break;
  case "ArrowDown":
      key = input.key.down;
      break;
  case "ArrowLeft":
      key = input.key.left;
      break;
  case "ArrowRight":
      key = input.key.right;
      break;
  case "Enter":
      key = input.key.enter;
      break;
  case "Escape":
      key = input.key.escape;
      break;
  default:
      return false;
  }

  key.is_down = false;
  return false;
}

function handle_wheel(e) {
  e.preventDefault();

  if (turn_state != game_states.ANGLE_SELECT) return false;

  input.mouse.wheel_delta = -e.deltaY;

  return false;
}

// update was_down and pressed for all pressable keys and mouse buttons
function update_inputs() {
  var button = input.mouse.button_left;
  if (button.was_down)
    button.pressed = false;
  if (button.is_down && !button.was_down)
    button.pressed = true;
  if (button.is_down)
    button.was_down = true;
  else
    button.was_down = false;

  button = input.mouse.button_right;
  if (button.was_down)
    button.pressed = false;
  if (button.is_down && !button.was_down)
    button.pressed = true;
  if (button.is_down)
    button.was_down = true;
  else
    button.was_down = false;

  for (var key_name in input.key) {
    var key = input.key[key_name]; 
    if (key.was_down)
      key.pressed = false;

    if (key.is_down && !key.was_down)
      key.pressed = true;

    if (key.is_down)
      key.was_down = true;
    else
      key.was_down = false;
  }
}


// game loop functions
// start menu data:
// active_button,
// list of buttons (width, height, text, etc.)

function start_menu_loop(dt) {
  // react to input
  start_menu_update(dt);

  // draw background
  ctx.drawImage(start_menu_background, 0, 0, canvas.width, canvas.height);

  // draw buttons
  ctx.font = "bold 48px Arial";
  ctx.textBaseline = "top";
  for (var i=0; i<start_menu.buttons.length; i++) {
    var button = start_menu.buttons[i];
    if (i == start_menu.active_button) {
      ctx.fillStyle = "#88E0A5";
      ctx.fillRect(button.x-20, button.y - 5 + button.height/2, 10, 10);
      ctx.fillRect(button.x+button.width+10, button.y - 5 + button.height/2, 10, 10);
      ctx.fillText(button.text, button.x, button.y);
    } else {
      ctx.fillStyle = "#756659";
      ctx.fillText(button.text, button.x, button.y);
    }

  }
  ctx.fillStyle = "black";


}

function start_menu_update(dt) {
  if (input.key.escape.pressed) {
    quit = true;
    return;
  }

  // if up or down arrow key pressed, increment or decrement active_button
  if (input.key.down.pressed) {
    if (start_menu.active_button < start_menu.buttons.length - 1)
      start_menu.active_button++;
  }

  if (input.key.up.pressed) {
    if (start_menu.active_button > 0)
      start_menu.active_button--;
  }

  // if enter key pressed, select the current menu item
  if (input.key.enter.pressed) {
    game_state = game_states.CHARACTER_SELECT;
    return;
  }

  // if mouse is moved over a button, update the active_button
  // if click on button, select that menu item
  for (var i=0; i<start_menu.buttons.length; i++) {
    var button = start_menu.buttons[i];

    if (collision_point_box(input.mouse, button)) {
      start_menu.active_button = i;

      if (input.mouse.button_left.pressed) {
        game_state = game_states.CHARACTER_SELECT;
        return;
      }
    }
  }
  
}

function init_character_select() {

  var half_width = canvas.width/2;
  var half_height = canvas.height/2;
  var sp_height = 100;

  character_select.active_character = 0;

  character_select.select_player_height = sp_height;

  character_select.images.push({
    name: "Joe",
    x: 0,
    y: 0,
    width: half_width,
    height: half_height - sp_height/2,
    image: character_select_joe
  });

  character_select.images.push({
    name: "Al",
    x: half_width,
    y: 0,
    width: half_width,
    height: half_height - sp_height/2,
    image: character_select_al
  });

  character_select.images.push({
    name: "Sid",
    x: 0,
    y: half_height + sp_height/2,
    width: half_width,
    height: half_height - sp_height/2,
    image: character_select_sid
  });

  character_select.images.push({
    name: "Lefty",
    x: half_width,
    y: half_height + sp_height/2,
    width: half_width,
    height: half_height - sp_height/2,
    image: character_select_lefty
  });
}

function character_select_loop(dt) {
  var cs = character_select;

  character_select_update(dt);

  // draw character images
  ctx.filter = 'grayscale(1)';
  for (var i=0; i<cs.images.length; i++) {
    var c = cs.images[i];

    if (cs.active_character == i) {
      ctx.filter = 'none';
      ctx.drawImage(c.image, c.x, c.y, c.width, c.height);
      ctx.filter = 'grayscale(1)';
    } 
    else
      ctx.drawImage(c.image, c.x, c.y, c.width, c.height);
  }
  ctx.filter = 'none';

  // draw "select player" image
  var half_width = canvas.width/2;
  var half_height = canvas.height/2;

  if (cs.player_id == 0)
    ctx.drawImage(select_player_one, 0, half_height - cs.select_player_height/2, canvas.width, cs.select_player_height);
  else
    ctx.drawImage(select_player_two, 0, half_height - cs.select_player_height/2, canvas.width, cs.select_player_height);

}

function character_select_update(dt) {
  var cs = character_select;

  // if key arrow right or down, increment active character
  if (input.key.right.pressed || input.key.down.pressed) {
      cs.active_character++;
    if (cs.active_character >= cs.images.length)
      cs.active_character = 0;
  }

  // if key arrow left or up, decrement active character
  if (input.key.left.pressed || input.key.up.pressed) {
      cs.active_character--;
    if (cs.active_character < 0)
      cs.active_character = cs.images.length - 1;
  }

  // if enter key pressed, select the current character
  if (input.key.enter.pressed) {
    players[cs.player_id].character_id = cs.active_character;
    cs.player_id++;
    if (cs.player_id > 1) {
      game_state = game_states.GAME;
      return;
    }
  }

  // if mouse hover over character, make it active
  for (var i=0; i<cs.images.length; i++) {
    var c = cs.images[i];

    if (collision_point_box(input.mouse, c)) {
      cs.active_character = i;

      if (input.mouse.button_left.pressed) {
        players[cs.player_id].character_id = i;
        cs.player_id++;
        if (cs.player_id > 1) {
          game_state = game_states.GAME;
          return;
        }
      }
    }
  }

}

//
// main game code
// 

function ui_reset() {
  var arc_width = 0.15 * ui_canvas.width;
  var arc_height = 0.63 * ui_canvas.height;
  var arc_left = ui_canvas.width - arc_width;
  var arc_top = ui_canvas.height - arc_height;

  ui_state.arc_fill.width = 0.20 * arc_width;
  ui_state.arc_fill.height_max = 0.75 * arc_height; 
  ui_state.arc_fill.left = arc_left + (0.65 * arc_width);
  ui_state.arc_fill.bottom = arc_top + (0.93 * arc_height);

  ui_state.arc_fill.fill_max = 5000; // arbitrary 

  ui_ctx.drawImage(ui_arc, arc_left, arc_top, arc_width, arc_height);
}


function init_entities() {

  // init characters
  characters.push({
    name: "Joe",
    x: 0,
    y: 0,
    width: 250,
    height: 470,
    image: character_joe
  });

  characters.push({
    name: "Al",
    x: 0,
    y: 0,
    width: 200,
    height: 470,
    image: character_al
  });

  characters.push({
    name: "Sid",
    x: 0,
    y: 0,
    width: 200,
    height: 470,
    image: character_sid
  });

  characters.push({
    name: "Lefty",
    x: 0,
    y: 0,
    width: 200,
    height: 470,
    image: character_lefty
  });


  // init players
  for (var i=0; i<players.length; i++) {
    players[i].shoes_left = 2;
    players[i].y = canvas.height - 555 - 25;
  }

}

function reset_round_girl() {
  round_girl.width = 200;
  round_girl.height = 555;
  round_girl.x = 0;
  round_girl.y = canvas.height - round_girl.height - 25;
  round_girl.speed = 478;
}

function reset_horseshoes() {
  for (var i=0; i<horseshoes.length; i++) {
    //vec3.zero(horseshoes[i].position);
    vec3.set(horseshoes[i].position, 0,-0.3,0);
    vec3.zero(horseshoes[i].velocity);
    vec3.zero(horseshoes[i].rotation);
  }
}

function reset_player_positions() {
  for (var i=0; i<players.length; i++) {
    var p = players[i];
    var c = characters[p.character_id];
    if (p.active) {
      p.x = 0.25 * canvas.width;
      p.y = canvas.height - c.height;
    } else {
      // sitting down position
      p.x = 0;
      p.y = 0;
    }
  }

}

function resize_canvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  ui_canvas.width = canvas.clientWidth;
  ui_canvas.height = canvas.clientHeight;
}
 
function get_active_player() {
  for (var i=0; i<players.length; i++)
    if (players[i].active)
      return players[i];
  return null;
}


function simulate(dt) {
  update(dt);
  draw(dt);
}


function update(dt) {
  if (input.key.escape.pressed) {
    quit = true;
    return
  }

  switch (turn_state) {
    case game_states.NEW_ROUND:
        update_new_round(dt);
        break;
    case game_states.HORIZONTAL_POSITION:
        update_horizontal_position(dt);
        break;
    case game_states.ANGLE_SELECT:
        update_angle_select(dt); 
        break;
    case game_states.THROWING:
        update_throwing(dt);
        break;
    default:
        console.log('Invalid state in update: ', turn_state);
        return;
  }

  // player one throws two horseshoes

  // player two throws two horseshoes

  // calculate score

  // calculate horizontal position 
  // calculate angle 
  // calculate velocity
  // calculate horseshoe position

}

function draw(dt) {
  if (turn_state == game_states.THROWING && false /* horseshoe close to ground */) {
    // draw pit closeup
    ctx.drawImage(pit_close, 0, 0, canvas.width, canvas.height);

  } else {
    // draw wide background
    ctx.drawImage(game_background, 0, 0, canvas.width, canvas.height);

    // draw round_girl
    if (turn_state == game_states.NEW_ROUND)
      ctx.drawImage(round_girl.image, round_girl.x, round_girl.y, round_girl.width, round_girl.height);

    // draw players
    for (var i=0; i<players.length; i++) {
      var player = players[i];
      var character = characters[player.character_id];

      if (player.active) {
        ctx.drawImage(character.image, player.x, player.y, character.width, character.height);
      } else {
        // draw player sitting
      }
    }

    
    if (turn_state == game_states.THROWING) {
      draw_grid();

      // draw horseshoe
      //if (active_horseshoe >= 0) {
        //var shoe = horseshoes[active_horseshoe];
        //var coords = world_to_screen_coords(shoe.position);
        //ctx.fillRect(coords[0], coords[1], 10, 10);
      //}
    }

    // draw horseshoe
    if (active_horseshoe >= 0) {
      var shoe = horseshoes[active_horseshoe];
      var coords = world_to_screen_coords(shoe.position);
      console.log("after: ", coords);
      console.log("shoe position: ", shoe.position);
      ctx.fillStyle = "#FF0000";
      ctx.fillRect(coords[0], coords[1], 10, 10);
    }


  }

 
  // basic idea:

  // if player is still throwing, show wide background

  // animate the horseshoe and character

  // if the horseshoe has almost reached the ground, switch to close up view

  // animate horseshoe


  // after horseshoe has settled, if its the last shoe of this round, show points for this round,
  // switch back to wide background

  // if beginning of a round, animate round girl
}

var scale = 1;
var h = 0;
var o_z = 0;
var grid_lines = [
  // into screen 
  [vec3.fromValues(-1,h,0+o_z), vec3.fromValues(-1,h,14+o_z)],
  [vec3.fromValues(1,h,0+o_z), vec3.fromValues(1,h,14+o_z)],
  // horizontal
  [vec3.fromValues(-1,h,0+o_z), vec3.fromValues(1,h,0+o_z)],
  [vec3.fromValues(-1,h,2+o_z), vec3.fromValues(1,h,2+o_z)],
  [vec3.fromValues(-1,h,12+o_z), vec3.fromValues(1,h,12+o_z)],
  [vec3.fromValues(-1,h,14+o_z), vec3.fromValues(1,h,14+o_z)],
]

for (var i=0; i<grid_lines.length; i++) {
  vec3.mul(grid_lines[i][0], grid_lines[i][0], [scale, 1, scale]);
  vec3.mul(grid_lines[i][1], grid_lines[i][1], [scale, 1, scale]);
}


console.log(grid_lines);

function draw_grid() {
  var line, a, b;
  ctx.strokeStyle = 'black';
  for (var i=0; i<grid_lines.length; i++) {
    line = grid_lines[i];
    a = world_to_screen_coords(line[0]);
    b = world_to_screen_coords(line[1]);

    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}



function update_new_round(dt) {
  // update round girl's position
  round_girl.x += round_girl.speed * dt;

  if (round_girl.x > canvas.width) {
    turn_state = game_states.HORIZONTAL_POSITION;
    players[0].active = true;
    reset_player_positions();
    ui.style.display = "block";
  }
}

var count = 0
function update_horizontal_position(dt) {

  if (count++ > 1000) quit = true;

  for (var i=0; i<players.length; i++) {
    if (!players[i].active) continue;
    var character = characters[players[i].character_id];
    players[i].x = input.mouse.x - character.width/2; 

    // TEMPORARY
    var x_scale = 1;
    var shoe = horseshoes[active_horseshoe];
    shoe.position[0] = x_scale * ((2 * (players[i].x + character.width) / canvas.width) - 1);
    //shoe.position = screen_to_world_coords([players[i].x, canvas.height-100]);
    //console.log("x: ", players[i].x);
    //console.log(shoe.position);
    //
  }

  if (input.mouse.button_left.pressed) {
    turn_state = game_states.ANGLE_SELECT;
  }
}

function update_angle_select(dt) {

  if (turn_state != game_states.ANGLE_SELECT) return;

  // begin throw
  if (input.mouse.wheel_delta < 0) {
    //var position = horseshoes[active_horseshoe].position;
    //var p = get_active_player();
    //vec3.set(position, p.x, position[1], position[2]);

    // TODO(shaw): calculate throwing velocity based on power and angle
    var velocity = horseshoes[active_horseshoe].velocity;
    vec3.set(velocity, 0.25, -6, 10);

    turn_state = game_states.THROWING;
    ui_reset();
    return;
  }

  if (input.mouse.wheel_delta == 0) return;

  var fill_amount = ui_state.arc_fill.fill_amount;
  var fill_max = ui_state.arc_fill.fill_max;

  fill_amount += input.mouse.wheel_delta;
  // scroll towards body (for my setup, need to handle the opposite configuration as well)
  fill_amount = Math.min(Math.max(fill_amount, 0), fill_max);

  var percentage = fill_amount / fill_max;

  var fill_height = percentage * ui_state.arc_fill.height_max;

  ui_ctx.fillStyle = "#881122";
  ui_ctx.fillRect(ui_state.arc_fill.left, 
    ui_state.arc_fill.bottom - fill_height, 
    ui_state.arc_fill.width,
    fill_height);

  // update fill amount in ui_state
  ui_state.arc_fill.fill_amount = fill_amount;
}


function world_to_screen_coords(v3) {
  var canvas_coords = vec2.create();

  // world to camera space coords
  var coords = vec4.fromValues(v3[0], v3[1], v3[2], 1);
  vec4.transformMat4(coords, coords, modelview);

  // perspective projection
  vec4.transformMat4(coords, coords, projection);

  // homogenous to cartesian coords
  if (coords[3] != 1) {
    vec4.div(coords, coords, [coords[3], coords[3], coords[3], 1]);
  }

  // viewport transform
  canvas_coords[0] = (coords[0] + 1) * 0.5 * canvas.width;
  canvas_coords[1] = (1 - (coords[1] + 1) * 0.5) * canvas.height;

  return canvas_coords;
}

function screen_to_world_coords(v2, z=-1) {
  var world_coords = vec3.fromValues(v2[0], v2[1], z);

  // screen to NDC coords
  //world_coords[0] = (world_coords[0] * 2 / canvas.width) - 1;
  //world_coords[1] = (2 * (1 - (world_coords[1] / canvas.height))) - 1;

  world_coords[0] = 1 - (world_coords[0] / canvas.width);
  world_coords[1] = 1 - (world_coords[1] / canvas.height);

  var image_height = 2 * Math.tan(fov_degrees * 0.5 * Math.PI / 180) * near;
  var image_width  = image_height * (canvas.width / canvas.height);

  var image_x = (world_coords[0] * 2  * image_width) - image_width;
  var image_y = (world_coords[1] * 2  * image_height) - image_height;

  // camera coords
  var cam_z = 2.9;
  world_coords[0] = (image_x / near) * cam_z;
  //world_coords[1] = (image_y / near) * cam_z;
  world_coords[1] = 0;
  world_coords[2] = 0;

  //var transform = mat4.create();
  //mat4.mul(transform, projection, modelview);
  //mat4.invert(transform, transform);

  //vec4.transformMat4(world_coords, world_coords, transform);
  
  //vec4.div(world_coords, world_coords, [world_coords[3], world_coords[3], world_coords[3], 1]);
  //world_coords[1] = 0;
  //world_coords[2] = 0;
  //world_coords[3] = 1;

  //console.log(world_coords);
  return world_coords;
}


var new_position = vec3.create();
function update_throwing(dt) {
  var shoe = horseshoes[active_horseshoe];

  // update velocity by acceleration
  vec3.add(shoe.velocity, shoe.velocity, [0, gravity*dt, 0]);
  
  // update position by velocity
  vec3.scaleAndAdd(new_position, shoe.position, shoe.velocity, dt);

  // if grounded, set y position to 0
  var ground_height = 0;
  if (new_position[1] >= ground_height) {
    vec3.set(new_position, new_position[0], ground_height, new_position[2]);
    shoe.velocity[1] = 0;
    vec3.scale(shoe.velocity, shoe.velocity, 0.9);
  }

  // commit position change
  vec3.copy(shoe.position, new_position);

  // draw
}


/***************************************************************************
 ***************************************************************************/

run();


}
