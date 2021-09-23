window.onload = function () {
// globals
var game_modes = {
  "START_MENU": 0,
  "GAME": 1
}
var game_mode = game_modes.START_MENU;
var last_timestep = performance.now();
var quit = false;
var buttons = {
  "start_menu": []
};

var input = {
  mouse: { 
    x: 0, y: 0,
    button_left:  { is_down: false, pressed: false, was_down: false },
    button_right: { is_down: false, pressed: false, was_down: false },
  },
  key: {
    up:    { is_down: false, pressed: false, was_down: false },
    down:  { is_down: false, pressed: false, was_down: false },
    left:  { is_down: false, pressed: false, was_down: false },
    right: { is_down: false, pressed: false, was_down: false },
  },
};

var canvas = document.getElementById("stage");
var ctx = canvas.getContext("2d");

canvas.addEventListener("mousemove", handle_mousemove);
canvas.addEventListener("mousedown", handle_mousedown);
canvas.addEventListener("mouseup", handle_mouseup);
document.addEventListener("keydown", handle_keydown);
document.addEventListener("keyup", handle_keyup);

// main loop
function loop(timestamp) {
  update_inputs();

  var dt = timestamp - last_timestamp;
  last_timestamp = timestamp;

  if (game_mode == game_modes.START_MENU)
    start_menu(dt);
  else
    simulate(dt);

  if (!quit) {
    requestAnimationFrame(loop);
  }
}

function run() {
  init();
  last_timestamp = performance.now();
  requestAnimationFrame(loop);
}


function init() {

  // init start menu buttons
  ctx.font = "bold 48px Arial";
  var button_y = canvas.height/2;
  var button_height = 40;
  var button_padding = 20;

  buttons.start_menu.push({
    "text": "START",
    "x": canvas.width/2 - ctx.measureText("START").width/2,
    "y": button_y,
    "width": ctx.measureText("START").width,
    "height": button_height
  });

  button_y += button_height + button_padding;

  buttons.start_menu.push({
    "text": "OPTIONS",
    "x": canvas.width/2 - ctx.measureText("OPTIONS").width/2,
    "y": button_y,
    "width": ctx.measureText("OPTINOS").width,
    "height": button_height
  });

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

  if (!button.is_down)
    button.pressed = true;
  else 
    button.pressed = false;

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
  default: 
      return false;
  }

  // TODO(shaw): need to ignore the delay for key repeat events
  // in order to report key pressed accurately
  if (!key.is_down)
    key.pressed = true;
  else
    key.pressed = false;

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
  default:
      return false;
  }

  key.is_down = false;
  key.pressed = false;

  return false;
}

// update was_down and pressed for all pressable keys and mouse buttons
function update_inputs() {
  var button = input.mouse.button_left;
  if (button.was_down)
    button.pressed = false;
  if (button.is_down)
    button.was_down = true;
  else
    button.was_down = false;

  button = input.mouse.button_right;
  if (button.was_down)
    button.pressed = false;
  if (button.is_down)
    button.was_down = true;
  else
    button.was_down = false;


  for (var key_name in input.key) {
    var key = input.key[key_name]; 
    if (key.was_down)
      key.pressed = false;
    if (key.is_down)
      key.was_down = true;
    else
      key.was_down = false;
  }
}


// game loop functions
var active_button = 0;
function start_menu(dt) {
  // react to input
  update_active_button();

  // draw background
  ctx.drawImage(start_menu_background, 0, 0, canvas.width, canvas.height);

  // draw buttons
  ctx.font = "bold 48px Arial";
  ctx.textBaseline = "top";
  for (var i=0; i<buttons.start_menu.length; i++) {
    var button = buttons.start_menu[i];
    if (i == active_button) {
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

function update_active_button() {
  // if up or down arrow key pressed, increment or decrement active_button
  if (input.key.down.pressed) {
    if (active_button < buttons.start_menu.length - 1)
      active_button++;
  }

  if (input.key.up.pressed) {
    if (active_button > 0)
      active_button--;
  }


  // if mouse is moved over a button, update the active_button
  for (var i=0; i<buttons.start_menu.length; i++) {
    var button = buttons.start_menu[i];
    if (collision_point_box(input.mouse, button)) {
      active_button = i;
    }
  }
  
}

function simulate(dt) {

}




run();

}
