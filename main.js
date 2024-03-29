window.onload = function () {

var X = 0;
var Y = 1;
var Z = 2;
var W = 3;

var { mat4, vec2, vec3, vec4 } = glMatrix;

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
  "THROWING": 6,
  "SCORING": 7
}

var gravity = -9;
var elapsed = 0;

var view = mat4.create();
var closeup_view = mat4.create();
var overhead_view = mat4.create();
var projection = mat4.create();
var inverse_projection_view = mat4.create(); // used for screen to world coords

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
  "dirty": false,         // set to true to trigger a ui repaint
  "arc" : {
    "active": false,
    "width": 0,
    "height": 0,
    "left": 0,
    "top": 0,
    "arc_fill": {
      "width": 0,
      "height_max": 0,
      "left": 0,
      "bottom": 0,
      "fill_max": 0, 
      "fill_amount": 0
    }
  },
  "mini_view": {
    "active": false,
    "width": 0,
    "height": 0,
    "left": 0,
    "top": 0,
  },
  "scoreboard": {
    "active": false,
    "width": 0,
    "height": 0,
    "left": 0,
    "top": 0,
    "sheet_width": 0,
    "sheet_height": 0,
    "number_width": 0,
    "number_height": 0,
    "score1": {
      "ones_x": 0,
      "ones_y": 0,
      "tens_x": 0,
      "tens_y": 0,
    },
    "score2": {
      "ones_x": 0,
      "ones_y": 0,
      "tens_x": 0,
      "tens_y": 0,
    }
  },
  "end_of_round_score": {
    "active": false,
    "width": 0,
    "height": 0,
    "left": 0,
    "top": 0,
  },
  "numbers": {
    "sheet_x": 0,
    "sheet_y": 0,
    "number_width": 0,
    "number_height": 0
  }
}

var closeup = false;
var scoring_delay = 4; // seconds
var scoring_timer = scoring_delay;
var round_counter = 1;

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
  { id: 0, character_id: 0, x: 0, y: 0, score: 0, shoes_left: 0, active: false, tutorial_viewed: false },
  { id: 1, character_id: 0, x: 0, y: 0, score: 0, shoes_left: 0, active: false, tutorial_viewed: false }
];

var active_horseshoe = 0;
var horseshoes = [
  { position: vec3.create(), velocity: vec3.create(), rotation: vec3.create(), width: 0, height: 0 },
  { position: vec3.create(), velocity: vec3.create(), rotation: vec3.create(), width: 0, height: 0 },
  { position: vec3.create(), velocity: vec3.create(), rotation: vec3.create(), width: 0, height: 0 },
  { position: vec3.create(), velocity: vec3.create(), rotation: vec3.create(), width: 0, height: 0 }
];

var stake = {
  position: vec3.fromValues(0, 0, -13),
  height: 0.5
}

var round_girl = {
  x: 0,
  y: 0,
  sprite_width: 0,
  sprite_height: 0,
  width: 0,
  height: 0,
  speed: 0,
  image: round_girl_spritesheet,
  sheet_off_x: 0,
  sheet_off_y: 0,
  animation: null
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
    w:  { is_down: false, pressed: false, was_down: false },
    a:  { is_down: false, pressed: false, was_down: false },
    s:  { is_down: false, pressed: false, was_down: false },
    d:  { is_down: false, pressed: false, was_down: false },
    q:  { is_down: false, pressed: false, was_down: false },
    e:  { is_down: false, pressed: false, was_down: false },
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
  elapsed += dt;
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
  var t = Math.tan(fov_degrees * 0.5 * Math.PI / 180) * near;    // top
  var r = aspect * t;                                            // right
  var l = -r;                                                    // left
  var b = -t;                                                    // bottom

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


function init() {
  resize_canvas(canvas);

  var aspect = canvas.width / canvas.height;
  var near = 0.1;
  var far = 100;
  var fov_degrees = 65; // fov y
  set_projection_matrix(projection, aspect, fov_degrees, near, far);

  // set view matrix
  //var s = 2.2;
  mat4.fromRotation(view, 0.38, [1,0,0]);
  mat4.translate(view, view, [0, -1.4, -1.05]);
  //mat4.scale(view, view, [s,s,s*.9]);

  //mat4.fromRotation(view, Math.PI/2, [1,0,0]);
  //mat4.translate(view, view, [0, -5, 13]);

  // set closeup view matrix
  mat4.fromRotation(closeup_view, 1.2, [1,0,0]);
  mat4.translate(closeup_view, closeup_view, [0, -1.4, 12.25]);
  //mat4.scale(closeup_view, closeup_view, [s,s,s*.9]);

  // TODO(shaw): This doesn't seem right. The far stake is at 13 meters 
  // the camera z being set to 13 should put it directly over the stake, but it takes double to 
  // put it there. It seems to be off by about a factor of 2.

  // set overhead view matrix
  mat4.fromRotation(overhead_view, Math.PI/2, [1,0,0]);
  mat4.translate(overhead_view, overhead_view, [0, -1.2, 13]);
  //mat4.scale(overhead_view, overhead_view, [s,s,s*.9]);

  // set inverse of projection * view
  mat4.mul(inverse_projection_view, projection, view);
  mat4.invert(inverse_projection_view, inverse_projection_view);

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

  init_ui();

  init_entities();

  init_character_select();

  round_counter = 1;

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
  // allow browser refresh
  if (e.key == 'r' && (e.metaKey || e.ctrlKey))
    return;

  if (!e.metaKey && !e.ctrlKey)
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
  case "w":
      key = input.key.w;
      break;
  case "a":
      key = input.key.a;
      break;
  case "s":
      key = input.key.s;
      break;
  case "d":
      key = input.key.d;
      break;
  case "q":
      key = input.key.q;
      break;
  case "e":
      key = input.key.e;
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
  case "w":
      key = input.key.w;
      break;
  case "a":
      key = input.key.a;
      break;
  case "s":
      key = input.key.s;
      break;
  case "d":
      key = input.key.d;
      break;
  case "q":
      key = input.key.q;
      break;
  case "e":
      key = input.key.e;
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
  //if (input.key.escape.pressed) {
    //quit = true;
    //return;
  //}

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
    image_team1: character_select_joe_team1,
    image_team2: character_select_joe_team2,
    image_selected: character_select_joe_selected,
    fade_duration: 2,
    fade_timer: 2,
  });

  character_select.images.push({
    name: "Al",
    x: half_width,
    y: 0,
    width: half_width,
    height: half_height - sp_height/2,
    image_team1: character_select_al_team1,
    image_team2: character_select_al_team2,
    image_selected: character_select_al_selected,
    fade_duration: 2,
    fade_timer: 2,
  });

  character_select.images.push({
    name: "Sid",
    x: 0,
    y: half_height + sp_height/2,
    width: half_width,
    height: half_height - sp_height/2,
    image_team1: character_select_sid_team1,
    image_team2: character_select_sid_team2,
    image_selected: character_select_sid_selected,
    fade_duration: 2,
    fade_timer: 2,
  });

  character_select.images.push({
    name: "Lefty",
    x: half_width,
    y: half_height + sp_height/2,
    width: half_width,
    height: half_height - sp_height/2,
    image_team1: character_select_lefty_team1,
    image_team2: character_select_lefty_team2,
    image_selected: character_select_lefty_selected,
    fade_duration: 2,
    fade_timer: 2,
  });
}

function character_select_loop(dt) {
  var cs = character_select;

  character_select_update(dt);

  // draw character images
  for (var i=0; i<cs.images.length; i++) {
    var c = cs.images[i];

    ctx.filter = 'grayscale(1)';

    if (c.was_selected) {
      // draw the selected image, and fade out over time
      ctx.filter = 'none'
      let old_alpha = ctx.globalAlpha;
      ctx.globalAlha = c.fade_timer;
      ctx.drawImage(c.image_selected, c.x, c.y, c.width, c.height);
      ctx.globalAlpha = old_alpha;
    } else if (cs.active_character == i) {
      ctx.filter = 'none';
      if (cs.player_id == 0)
        ctx.drawImage(c.image_team1, c.x, c.y, c.width, c.height);
      else
        ctx.drawImage(c.image_team2, c.x, c.y, c.width, c.height);
    } 
    else
      ctx.drawImage(c.image_team2, c.x, c.y, c.width, c.height);
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
    cs.images[cs.active_character].was_selected = true;
    if (cs.player_id > 1) {
      game_state = game_states.GAME;
      return;
    }
  }

  // if mouse hover over character, make it active
  for (var i=0; i<cs.images.length; i++) {
    var c = cs.images[i];

    if (collision_point_box(input.mouse, c) && !c.was_selected) {
      cs.active_character = i;

      // left click on image to select that character
      if (input.mouse.button_left.pressed) {
        players[cs.player_id].character_id = i;
        cs.player_id++;
        c.was_selected = true;
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

function init_ui() {
  var { arc, mini_view, scoreboard, end_of_round_score, numbers } = ui_state;

  // arc
  var arc_fill = ui_state.arc.arc_fill;
  arc.width = 0.15 * ui_canvas.width;
  arc.height = 0.63 * ui_canvas.height;
  arc.left = ui_canvas.width - arc.width;
  arc.top = ui_canvas.height - arc.height;

  arc_fill.width = 0.20 * arc.width;
  arc_fill.height_max = 0.75 * arc.height; 
  arc_fill.left = arc.left + (0.65 * arc.width);
  arc_fill.bottom = arc.top + (0.93 * arc.height);
  arc_fill.fill_max = 5000; // arbitrary 
  arc_fill.fill_amount = 0;

  // mini_view
  mini_view.width = 0.25 * ui_canvas.width;
  mini_view.height = 0.25 * ui_canvas.height;
  mini_view.left = ui_canvas.width - mini_view.width;
  mini_view.top = 0;

  // numbers
  numbers.number_width = 14;
  numbers.number_height = 16;

  // scoreboard
  scoreboard.sheet_width = 80;
  scoreboard.sheet_height = 75;
  scoreboard.width = 0.213 * ui_canvas.width;
  scoreboard.height = 0.297 * ui_canvas.height;
  scoreboard.left = 0;
  scoreboard.top = 0;
  scoreboard.number_width  = 0.20 * scoreboard.width;
  scoreboard.number_height = 0.22 * scoreboard.height;
  scoreboard.score1.ones_x = 0.49 * scoreboard.width;
  scoreboard.score1.ones_y = 0.37 * scoreboard.height;
  scoreboard.score1.tens_x = 0.225 * scoreboard.width;
  scoreboard.score1.tens_y = 0.37 * scoreboard.height;
  scoreboard.score2.ones_x = 0.49 * scoreboard.width;
  scoreboard.score2.ones_y = 0.69 * scoreboard.height;
  scoreboard.score2.tens_x = 0.225 * scoreboard.width;
  scoreboard.score2.tens_y = 0.69 * scoreboard.height;

  scoreboard.active = true;

  // end_of_round_score
  end_of_round_score.width = 0.47 * ui_canvas.width;
  end_of_round_score.height = 0.17 * ui_canvas.height;
  end_of_round_score.left = 0.5*ui_canvas.width - 0.5*end_of_round_score.width;
  end_of_round_score.top = ui_canvas.height - 0.1*ui_canvas.height - end_of_round_score.height;

  ui_state.dirty = true;
}


function ui_arc_reset() {
  ui_state.arc.arc_fill.fill_amount = 0;
  ui_state.dirty = true;
}


function init_entities() {

  // init characters
  characters.push({
    name: "Joe",
    x: 0,
    y: 0,
    width: 250,
    height: 470,
    image_team1: character_joe_team1,
    image_team2: character_joe_team2
  });

  characters.push({
    name: "Al",
    x: 0,
    y: 0,
    width: 200,
    height: 470,
    image_team1: character_al_team1,
    image_team2: character_al_team2
  });

  characters.push({
    name: "Sid",
    x: 0,
    y: 0,
    width: 200,
    height: 470,
    image_team1: character_sid_team1,
    image_team2: character_sid_team2
  });

  characters.push({
    name: "Lefty",
    x: 0,
    y: 0,
    width: 200,
    height: 470,
    image_team1: character_lefty_team1,
    image_team2: character_lefty_team2
  });

  // init round_girl
  round_girl.sprite_width = 100;
  round_girl.sprite_height = 256;
  round_girl.width = round_girl.sprite_width * 2.2;
  round_girl.height = round_girl.sprite_height * 2.2;
  round_girl.x = 0;
  round_girl.y = canvas.height - round_girl.height - 25;
  round_girl.speed = 225;
  round_girl.animation = new Animation();
  round_girl.animation.add_state("WALKING", 0, 4, 5);
  round_girl.animation.current_state = "WALKING";

  // init players
  for (var i=0; i<players.length; i++) {
    players[i].shoes_left = 2;
    players[i].y = canvas.height - 470;
  }

  // init horsehsoes
  for (var i=0; i<horseshoes.length; i++) {
    vec3.set(horseshoes[i].position, 0,0.3,0);
    vec3.zero(horseshoes[i].velocity);
    vec3.set(horseshoes[i].rotation, 0,0,0);
    horseshoes[i].width = 0.15;
    horseshoes[i].height = 0.15;
  }
}

function reset_horseshoes() {
  for (var i=0; i<horseshoes.length; i++) {
    vec3.set(horseshoes[i].position, 0,0.3,0);
    vec3.zero(horseshoes[i].velocity);
    vec3.set(horseshoes[i].rotation, 0,0,0);
  }
  active_horseshoe = 0;
}

function reset_player_positions() {
  for (var i=0; i<players.length; i++) {
    var p = players[i];
    var c = characters[p.character_id];
    p.x = 0.25 * canvas.width;
    p.y = canvas.height - c.height;
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
  draw();
  if (ui_state.dirty) 
    draw_ui();
}

function debug_move_camera(dt) {
  var speed = 3;
  if (input.key.w.is_down)
    mat4.translate(view, view, [0, 0, speed*dt]);
  else if (input.key.s.is_down)
    mat4.translate(view, view, [0, 0, -speed*dt]);

  if (input.key.a.is_down)
    mat4.translate(view, view, [speed*dt, 0, 0]);
  else if (input.key.d.is_down)
    mat4.translate(view, view, [-speed*dt, 0, 0]);

  if (input.key.up.is_down)
    mat4.translate(view, view, [0, -speed*dt, 0]);
  else if (input.key.down.is_down)
    mat4.translate(view, view, [0, speed*dt, 0]);

  if (input.key.q.is_down) 
    mat4.rotateX(view, view, 0.4*dt);
  else if (input.key.e.is_down)
    mat4.rotateX(view, view, -0.4*dt);


  if (input.key.w.is_down)
    mat4.translate(closeup_view, closeup_view, [0, 0, speed*dt]);
  else if (input.key.s.is_down)
    mat4.translate(closeup_view, closeup_view, [0, 0, -speed*dt]);

  if (input.key.a.is_down)
    mat4.translate(closeup_view, closeup_view, [speed*dt, 0, 0]);
  else if (input.key.d.is_down)
    mat4.translate(closeup_view, closeup_view, [-speed*dt, 0, 0]);

  if (input.key.up.is_down)
    mat4.translate(closeup_view, closeup_view, [0, -speed*dt, 0]);
  else if (input.key.down.is_down)
    mat4.translate(closeup_view, closeup_view, [0, speed*dt, 0]);

  if (input.key.q.is_down) 
    mat4.rotateX(closeup_view, closeup_view, 0.4*dt);
  else if (input.key.e.is_down)
    mat4.rotateX(closeup_view, closeup_view, -0.4*dt);

}

var count = 0;
function update(dt) {
  //if (input.key.escape.pressed) {
    //quit = true;
    //return;
  //}

  count++;
  //if (count > 1000) quit = true;

  debug_move_camera(dt);

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
    case game_states.SCORING:
        update_scoring(dt);
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


function Animation(animation_states) {
  if (animation_states) {
    this.states = Object.assign({}, animation_states);
  } else {
    this.states = {};
  }
  this.current_state = "IDLE";
  this.timer = 0;
  this.current_frame = 0;
}

Animation.prototype.add_state = function(name, start_index, stop_index, fps) {
  this.states[name] = { start_index, stop_index, fps };
}

function draw_text_centered_horiz(my_ctx, y, text) {
  var text_info = my_ctx.measureText(text);
  var x = 0.5*my_ctx.canvas.width - 0.5*text_info.width;
  my_ctx.fillText(text, x, y);
}

function draw() {
  // TODO(shaw): clearRect if backgrounds get moved to a new layer

  var switch_to_closeup_height = 1;
  var view_matrix = view;

  if (closeup) {
    view_matrix = closeup_view;

    // draw pit closeup
    // TODO(shaw): could move this to another layer to optimize drawing
    ctx.drawImage(pit_close, 0, 0, canvas.width, canvas.height);

    draw_grid(closeup_view);

  } else {
    // draw wide background
    // TODO(shaw): could move this to another layer to optimize drawing
    ctx.drawImage(game_background, 0, 0, canvas.width, canvas.height);

    draw_grid();

    // draw round_girl
    if (turn_state == game_states.NEW_ROUND) {
      //ctx.drawImage(round_girl.image, round_girl.x, round_girl.y, round_girl.width, round_girl.height);

      var animation = round_girl.animation;

      var sheet_off_x = round_girl.sheet_off_x + 
        (animation.states[animation.current_state].start_index * round_girl.sprite_width);

      var sheet_x = sheet_off_x + (animation.current_frame * round_girl.sprite_width);
      var sheet_y = round_girl.sheet_off_y;

      ctx.drawImage(round_girl.image, 
        sheet_x, sheet_y,
        round_girl.sprite_width, round_girl.sprite_height,
        round_girl.x, round_girl.y,
        round_girl.width, round_girl.height);

    }

    // draw players
    for (var i=0; i<players.length; i++) {
      var player = players[i];
      var character = characters[player.character_id];

      if (player.active) {
        var image = i == 0 ? character.image_team1 : character.image_team2;
        ctx.drawImage(image, player.x, player.y, character.width, character.height);
      } else {
        // draw player sitting
      }
    }

    
    if (turn_state == game_states.THROWING) {
      //draw_grid();

      // draw horseshoe
      //if (active_horseshoe >= 0) {
        //var shoe = horseshoes[active_horseshoe];
        //var coords = world_to_screen_coords(shoe.position);
        //ctx.fillRect(coords[0], coords[1], 10, 10);
      //}
    }

  }

  // draw horseshoes
  for (var i=0; i <= active_horseshoe; i++) {
    var shoe = horseshoes[i];
    
    var fl = vec3.fromValues(-shoe.width/2, 0, -shoe.height/2);
    var fr = vec3.fromValues(shoe.width/2, 0, -shoe.height/2);
    var bl = vec3.fromValues(-shoe.width/2, 0, shoe.height/2);
    var br = vec3.fromValues(shoe.width/2, 0, shoe.height/2);

    var rot = mat4.create();
    mat4.fromRotation(rot, shoe.rotation[0], [1,0,0]);

    vec3.transformMat4(fl, fl, rot);
    vec3.transformMat4(fr, fr, rot);
    vec3.transformMat4(bl, bl, rot);
    vec3.transformMat4(br, br, rot);

    //if (count % 16 == 0)

    // translate to shoe position
    var translate = mat4.create();
    mat4.fromTranslation(translate, shoe.position);
    vec3.transformMat4(fl, fl, translate);
    vec3.transformMat4(fr, fr, translate);
    vec3.transformMat4(bl, bl, translate);
    vec3.transformMat4(br, br, translate);

    var fl_coord = world_to_screen_coords(fl, view_matrix);
    var fr_coord = world_to_screen_coords(fr, view_matrix);
    var bl_coord = world_to_screen_coords(bl, view_matrix);
    var br_coord = world_to_screen_coords(br, view_matrix);
    
    //ctx.fillStyle = i < 2 ? "#FF0000" : "#00FF00";
    //ctx.fillStyle = "#FF0000";
    //ctx.fillRect(coords[0], coords[1], 10, 10);
    //ctx.fillStyle = "#00FF00";
    //ctx.fillRect(left_tip[0], left_tip[1], 10, 10);
    //ctx.fillStyle = "#0000FF";
    //ctx.fillRect(right_tip[0], right_tip[1], 10, 10);

    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    ctx.moveTo(fl_coord[X], fl_coord[Y]);
    ctx.lineTo(fr_coord[X], fr_coord[Y]);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = i < 2 ? "#FF0000" : "#00FF00";
    ctx.moveTo(fr_coord[X], fr_coord[Y]);
    ctx.lineTo(br_coord[X], br_coord[Y]);
    ctx.lineTo(bl_coord[X], bl_coord[Y]);
    ctx.lineTo(fl_coord[X], fl_coord[Y]);
    ctx.stroke();

  }

}

function draw_ui() {
  ui_ctx.clearRect(0, 0, ui_canvas.width, ui_canvas.height);

  var { arc, mini_view, scoreboard, end_of_round_score, numbers } = ui_state;
  var active_player = get_active_player();

  if (arc.active) {
    ui_ctx.drawImage(img_arc, arc.left, arc.top, arc.width, arc.height);

    var arc_fill = ui_state.arc.arc_fill;
    var percentage = arc_fill.fill_amount / arc_fill.fill_max;
    var fill_height = percentage * arc_fill.height_max;

    ui_ctx.fillStyle = "#881122";
    ui_ctx.fillRect(arc_fill.left, 
      arc_fill.bottom - fill_height, 
      arc_fill.width,
      fill_height);
  }

  if (mini_view.active) {
    ui_ctx.drawImage(img_mini_view, 
      mini_view.left, mini_view.top, 
      mini_view.width, mini_view.height);

    for (var i=0; i <= active_horseshoe; i++) {
      // draw horseshoe
      var dist = vec3.distance(horseshoes[i].position, stake.position);

      if (dist > 1) continue;

      var ndc_coords = world_to_ndc(horseshoes[i].position, overhead_view);
      var off_x = (ndc_coords[0] + 1) * 0.5 * mini_view.width;
      var off_y = (1 - (ndc_coords[1] + 1) * 0.5) * mini_view.height;


      var x = mini_view.left + off_x;
      var y = mini_view.top + off_y;

      ui_ctx.fillStyle = i < 2 ? "#FF0000" : "#00FF00";
      ui_ctx.fillRect(x, y, 5, 5);

    }
  }

  if (scoreboard.active) {
    ui_ctx.drawImage(img_scoreboard,
      scoreboard.left, scoreboard.top, 
      scoreboard.width, scoreboard.height);

    // TODO(shaw): use single spritesheet for all images

    // player 1 score
    var score1 = players[0].score;

    var tens = Math.floor(score1 / 10);
    var ones = score1 % 10;
    var sheet_y = numbers.sheet_y;
    var sheet_x;

    if (tens > 0) {
      sheet_x = numbers.sheet_x + tens * numbers.number_width;
      ui_ctx.drawImage(img_numbers,
        sheet_x, sheet_y,
        numbers.number_width, numbers.number_height,
        scoreboard.score1.tens_x, scoreboard.score1.tens_y,
        scoreboard.number_width, scoreboard.number_height);
    } 
    
    sheet_x = numbers.sheet_x + ones * numbers.number_width;
    ui_ctx.drawImage(img_numbers,
      sheet_x, sheet_y,
      numbers.number_width, numbers.number_height,
      scoreboard.score1.ones_x, scoreboard.score1.ones_y,
      scoreboard.number_width, scoreboard.number_height);

    // player 2 score
    var score2 = players[1].score;

    tens = Math.floor(score2 / 10);
    ones = score2 % 10;
    sheet_x = numbers.sheet_x + ones * numbers.number_width;

    if (tens > 0) {
      sheet_x = numbers.sheet_x + tens * numbers.number_width;
      ui_ctx.drawImage(img_numbers,
        sheet_x, sheet_y,
        numbers.number_width, numbers.number_height,
        scoreboard.score2.tens_x, scoreboard.score2.tens_y,
        scoreboard.number_width, scoreboard.number_height);
    } 
    
    sheet_x = numbers.sheet_x + ones * numbers.number_width;
    ui_ctx.drawImage(img_numbers,
      sheet_x, sheet_y,
      numbers.number_width, numbers.number_height,
      scoreboard.score2.ones_x, scoreboard.score2.ones_y,
      scoreboard.number_width, scoreboard.number_height);
  }

  if (end_of_round_score.active) {
    ui_ctx.drawImage(img_end_of_round_score,
      end_of_round_score.left, end_of_round_score.top, 
      end_of_round_score.width, end_of_round_score.height);

    // TODO
    //var score1 = ;
    //ui_ctx.drawImage(img_spritesheet,
      //score.sheet_x, score.sheet_y,
      //score.width, score.height,
      //score.x, score.y,
      //score.width, score.height);
  }

  // draw tutorial text boxes
  if (active_player && !active_player.viewed_tutorial) {
    var font_size = 24;
    ui_ctx.font = `bold ${font_size}px serif`;
    var padding = 15;
    var tut_x = padding;
    var tut_y = 0.7*ui_ctx.canvas.height;
    var box_w = 0.5*ui_ctx.canvas.width;
    var box_h = 3 * font_size + 2*padding;
    var box_x = 0.5*ui_ctx.canvas.width - 0.5*box_w;
    var box_y = tut_y;
    var box_color = "#FFFFDD99";
    var text_color = "#000011";
    var max_text_width = box_w - 2*padding;

    if (turn_state == game_states.HORIZONTAL_POSITION) {
      ui_ctx.fillStyle = box_color;
      ui_ctx.fillRect(box_x, box_y, box_w, box_h);

      ui_ctx.fillStyle = text_color;
      var text1 = "Move mouse left and right to position your shot.";
      ui_ctx.fillText(text1, box_x + padding, tut_y+font_size+padding, max_text_width);
      var text2 = "Click left mouse button to lock in your position.";
      ui_ctx.fillText(text2, box_x + padding, tut_y+2.5*font_size+padding, max_text_width);

    } else if (turn_state == game_states.ANGLE_SELECT) {
      ui_ctx.fillStyle = box_color;
      ui_ctx.fillRect(box_x, box_y, box_w, box_h);

      ui_ctx.fillStyle = text_color;
      var text1 = "Scroll back on mouse wheel to select throw angle.";
      ui_ctx.fillText(text1, box_x + padding, tut_y+font_size+padding, max_text_width);
      var text2 = "Scroll forward with velocity on mouse wheel to throw.";
      ui_ctx.fillText(text2, box_x + padding, tut_y+2.5*font_size+padding, max_text_width);
    }
  }

  ui_state.dirty = false;
}

var scale = 1;
var h = 0;
var o_z = 0;
var grid_lines = [
  // into screen 
  [vec3.fromValues(-1,h,0+o_z), vec3.fromValues(-1,h,-14+o_z)],
  [vec3.fromValues(1,h,0+o_z), vec3.fromValues(1,h,-14+o_z)],
  // horizontal
  [vec3.fromValues(-1,h,0+o_z), vec3.fromValues(1,h,0+o_z)],
  [vec3.fromValues(-1,h,-2+o_z), vec3.fromValues(1,h,-2+o_z)],
  [vec3.fromValues(-1,h,-12+o_z), vec3.fromValues(1,h,-12+o_z)],
  [vec3.fromValues(-1,h,-14+o_z), vec3.fromValues(1,h,-14+o_z)],
]

for (var i=0; i<grid_lines.length; i++) {
  vec3.mul(grid_lines[i][0], grid_lines[i][0], [scale, 1, scale]);
  vec3.mul(grid_lines[i][1], grid_lines[i][1], [scale, 1, scale]);
}

function draw_grid(view_matrix=view, fill=true) {
  var line, point, a, b, c, d;

  if (fill) {
    ctx.fillStyle = 'blue';
    a = world_to_screen_coords(grid_lines[2][0], view_matrix);
    b = world_to_screen_coords(grid_lines[3][0], view_matrix);
    c = world_to_screen_coords(grid_lines[3][1], view_matrix);
    d = world_to_screen_coords(grid_lines[2][1], view_matrix);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.fill();

    ctx.fillStyle = 'orange';
    a = world_to_screen_coords(grid_lines[4][0], view_matrix);
    b = world_to_screen_coords(grid_lines[5][0], view_matrix);
    c = world_to_screen_coords(grid_lines[5][1], view_matrix);
    d = world_to_screen_coords(grid_lines[4][1], view_matrix);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.fill();
  }

  ctx.strokeStyle = 'black';
  for (var i=0; i<grid_lines.length; i++) {
    line = grid_lines[i];
    a = world_to_screen_coords(line[0], view_matrix);
    b = world_to_screen_coords(line[1], view_matrix);

    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}

function update_new_round(dt) {
  // update round girl's position
  round_girl.x += round_girl.speed * dt;

  // animate
  var animation = round_girl.animation;
  var animation_state = animation.states[animation.current_state];
  animation.timer += dt;
  var frame_index = Math.floor(animation.timer * animation_state.fps) % (1 + animation_state.stop_index - animation_state.start_index);
  animation.current_frame = animation_state.start_index + frame_index;
  if (animation.current_frame > animation_state.stop_index)
    animation.current_frame = animation_state.start_index;

  if (round_girl.x > canvas.width) {
    animation.timer = 0;
    players[0].active = true;
    players[1].active = false;
    round_girl.x = -round_girl.width;
    ui_state.arc.active = true;
    ui_state.dirty = true;
    turn_state = game_states.HORIZONTAL_POSITION;
  }
}

function update_horizontal_position(dt) {
  var player = get_active_player();
  var character = characters[player.character_id];
  player.x = input.mouse.x - character.width/2; 
  var shoe = horseshoes[active_horseshoe];
  shoe.position = screen_to_world_coords([player.x + character.width-35, canvas.height-100], 0.875);

  if (input.mouse.button_left.pressed) {
    turn_state = game_states.ANGLE_SELECT;
    ui_state.dirty = true;
  }
}

function update_angle_select(dt) {

  if (turn_state != game_states.ANGLE_SELECT) return;

  // begin throw
  if (input.mouse.wheel_delta < 0) {
    // TODO(shaw): calculate throwing velocity based on power and angle
    var velocity = horseshoes[active_horseshoe].velocity;
    vec3.set(velocity, -0.25, 7, -7.9);
    turn_state = game_states.THROWING;

    var player = get_active_player();
    if (player && !player.viewed_tutorial) {
      player.viewed_tutorial = true;
      ui_state.dirty = true;
    }

    return;
  }

  else if (input.mouse.wheel_delta == 0) 
    return;

  else { // wheel_delta > 0
    var fill_amount = ui_state.arc.arc_fill.fill_amount;
    var fill_max = ui_state.arc.arc_fill.fill_max;

    // scroll towards body (for my setup. need to handle the opposite configuration as well)
    fill_amount += input.mouse.wheel_delta;
    fill_amount = Math.min(Math.max(fill_amount, 0), fill_max);

    // update fill amount in ui_state
    ui_state.arc.arc_fill.fill_amount = fill_amount;

    ui_state.dirty = true;
  }
}

function world_to_ndc(v3, view_matrix=view) {
  // world to camera space coords
  var coords = vec4.fromValues(v3[X], v3[Y], v3[Z], 1);
  vec4.transformMat4(coords, coords, view_matrix);

  // perspective projection
  vec4.transformMat4(coords, coords, projection);

  // homogenous to cartesian coords, in NDC space
  if (coords[W] != 1) {
    vec4.div(coords, coords, [coords[W], coords[W], coords[W], 1]);
  }

  return coords;
}

function world_to_screen_coords(v3, view_matrix=view) {
  var coords = world_to_ndc(v3, view_matrix);

  // temp hack to notify outside clip
  if (coords[X] < -1 || coords[X] > 1 ||
      coords[Y] < -1 || coords[Y] > 1 ||
      coords[Z] < -1 || coords[Z] > 1)
  {
    return [-1,-1];
  }

  var canvas_coords = vec2.create();

  // viewport transform
  canvas_coords[X] = (coords[X] + 1) * 0.5 * canvas.width;
  canvas_coords[Y] = (1 - (coords[Y] + 1) * 0.5) * canvas.height;

  return canvas_coords;
}


function screen_to_world_coords(v2, z=-1) {
  var world_coords = vec4.fromValues(v2[X], v2[Y], z, 1);

  // screen to NDC coords
  world_coords[X] = (world_coords[X] * 2 / canvas.width) - 1;
  world_coords[Y] = (2 * (1 - (world_coords[Y] / canvas.height))) - 1;

  // perspective
  vec4.transformMat4(world_coords, world_coords, inverse_projection_view);
  vec4.div(world_coords, world_coords, [world_coords[W], world_coords[W], world_coords[W], 1]);

  return vec3.fromValues(world_coords[X], world_coords[Y], world_coords[Z]);
}


function is_ringer(stake, shoe) {
  if (shoe.position[Z] > stake.position[Z] + 2)
    return false;

  if (shoe.position[Y] >= stake.height)
    return false;

  if (stake.position[X] < shoe.position[X] - shoe.width/2 ||
      stake.position[X] > shoe.position[X] + shoe.width/2)
    return false;


  var fl = vec3.fromValues(-shoe.width/2, 0, -shoe.height/2);
  var br = vec3.fromValues(shoe.width/2, 0, shoe.height/2);

  var rot = mat4.create();
  mat4.fromRotation(rot, shoe.rotation[0], [1,0,0]);

  vec3.transformMat4(fl, fl, rot);
  vec3.transformMat4(br, br, rot);

  // translate to shoe position
  var translate = mat4.create();
  mat4.fromTranslation(translate, shoe.position);
  vec3.transformMat4(fl, fl, translate);
  vec3.transformMat4(br, br, translate);

  if (stake.position[Z] < br[Z] && stake.position[Z] > fl[Z]) {
    return true;
  }

  return false;
}


var new_position = vec3.create();
function update_throwing(dt) {
  var ground_height = 0;
  var shoe = horseshoes[active_horseshoe];

  // update velocity by acceleration
  if (shoe.position[Y] > ground_height)
    vec3.add(shoe.velocity, shoe.velocity, [0, gravity*dt, 0]);
  
  // update position by velocity
  vec3.scaleAndAdd(new_position, shoe.position, shoe.velocity, dt);

  // check if grounded
  if (new_position[Y] <= ground_height) {
    vec3.set(new_position, new_position[X], ground_height, new_position[2]);
    shoe.velocity[Y] = 0;
    vec3.scale(shoe.velocity, shoe.velocity, 0.9);

    // TODO(shaw): make shoe lay flat depending on direction
    if (shoe.rotation[X] >= 0.5*Math.PI && shoe.rotation[X] <= 1.5*Math.PI) {
      shoe.rotation[X] = Math.PI;      
    } else {
      shoe.rotation[X] = 0;
    }

  } else {

    //
    // TODO(shaw): rotate based on each players throw style
    //

    // only rotate when not grounded
    var speed = 2;
    shoe.rotation[X] = (shoe.rotation[X] + speed*dt) % (2 * Math.PI);
  }

  // TODO(shaw): check for a collision with the stake that is not a ringer

  // check for ringer
  if (is_ringer(stake, shoe)) {
    shoe.position[Z] = stake.position[Z];
    shoe.velocity[Z] = 0;
    shoe.position[X] = stake.position[X];
    shoe.velocity[X] = 0;
    shoe.position[Y] = stake.position[Y];
    shoe.velocity[Y] = 0;
  }

  // commit position change
  vec3.copy(shoe.position, new_position);
  
  var switch_to_closeup_height = 1;
  if (!closeup && shoe.position[Y] <= switch_to_closeup_height && shoe.velocity[Y] <= 0) {
    closeup = true;
    ui_state.arc.active = false;
    ui_state.mini_view.active = false;
    ui_state.scoreboard.active = false;
    ui_state.dirty = true;
  }

  // transition to next game state: horizontal position
  if (Math.abs(shoe.velocity[X]) < 0.01 &&
      Math.abs(shoe.velocity[Y]) < 0.01 &&
      Math.abs(shoe.velocity[Z]) < 0.01)
  {
    scoring_timer = scoring_delay;
    turn_state = game_states.SCORING;
  }
}



function update_scoring(dt) {
  scoring_timer -= dt;

  // after 1 second
  if (scoring_timer <= scoring_delay-1 && !ui_state.mini_view.active) {
    ui_state.mini_view.active = true;
    ui_state.dirty = true;
  }

  // after 2 seconds
  if (scoring_timer <= scoring_delay-2) {
    if (active_horseshoe != horseshoes.length-1) { // not last horseshoe
      ui_arc_reset();
      closeup = false;
      ui_state.arc.active = true;
      ui_state.scoreboard.active = true;
      ui_state.dirty = true;

      active_horseshoe++;

      var player = get_active_player();
      var next_player_id = active_horseshoe < 2 ? 0 : 1;
      player.active = false;
      players[next_player_id].active = true;
      reset_player_positions();

      turn_state = game_states.HORIZONTAL_POSITION;
      return;
    }

    if (!ui_state.end_of_round_score.active) {
      var player1_ringers = 0;
      var player2_ringers = 0;
      var player1_points = 0;
      var player2_points = 0;

      var min_dist = 9999;
      var winner = -1;

      for (var i=0; i<horseshoes.length; i++) {
        if (is_ringer(stake, horseshoes[i])) {
          if (i < 2) {
            player1_ringers++;
            player1_points += 3;
          } else {
            player2_ringers++;
            player2_points += 3;
          }

        } else {

          var dist = vec3.distance(horseshoes[i].position, stake.position);
          if (dist < 0.17) {
            if (i < 2) 
              player1_points++;
            else
              player2_points++;

            // Case 4
            // only closest to stake scores points
            if (dist < min_dist) {
              min_dist = dist;
              winner = i < 2 ? 0 : 1;
            }
          }
        }
      }


      // Case 1 both players got 2 ringers
      // all points cancelled
      if (player1_ringers == 2 && player2_ringers == 2) {
        player1_points = 0;
        player2_points = 0;

      // Case 2 one player got 2 ringer, other got 1
      // the player with 2 ringers scores 3
      } else if (player1_ringers == 2 && player2_ringers == 1) {
        winner = 0;
        player1_points = 3;
      } else if (player2_ringers == 2 && player1_ringers == 1) {
        winner = 1;
        player2_points = 3;

      // Case 3 one player got ringer, other didnt
      // all this players points count
      } else if (player1_ringers > 0 && player2_ringers == 0) {
        winner = 0;
      } else if (player2_ringers > 0 && player1_ringers == 0) {
        winner = 1;
      }

      // Case 4 no ringers
      // only closest to stake scores points

      if (winner == 0)
        player2_points = 0;
      else if (winner == 1)
        player1_points = 0;

      players[0].score += player1_points;
      players[1].score += player2_points;

      console.log({ player1_points, player2_points });

      ui_state.end_of_round_score.active = true;
      ui_state.scoreboard.active = true;
      ui_state.dirty = true;
    }
  }

  if (scoring_timer <= 0) {
    ui_state.end_of_round_score.active = false;
    ui_state.mini_view.active = false;
    ui_arc_reset();
    closeup = false;
    ui_state.arc.active = true;
    ui_state.dirty = true;
    players[0].active = false;
    players[1].active = false;
    reset_player_positions();
    reset_horseshoes();

    // TODO: increment round counter
    turn_state = game_states.NEW_ROUND;
  }
}


/***************************************************************************
 ***************************************************************************/

run();


}
