window.onload = function () {

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

var game_state = game_states.START_MENU;
var turn_state = game_states.NEW_ROUND;

var last_timestep = performance.now();
var quit = false;

var start_menu = {
  active_button: 0,
  buttons: []
}

// order must match order of character_select.images
// joe, al, sid, lefty
var characters = [];

var character_select = {
  select_player_height: 0,
  images: [],
  active_character: 0,
  player_id: 0
}

var players = [
  { character_id: 0, x: 0, y: 0, score: 0, shoes_left: 0, active: false },
  { character_id: 0, x: 0, y: 0, score: 0, shoes_left: 0, active: false }
]

var round_girl = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  speed: 0,
  image: round_girl_sprite
}

var input = {
  mouse: { 
    x: 0, y: 0,
    button_left:  { is_down: false, pressed: false, was_down: false },
    button_right: { is_down: false, pressed: false, was_down: false },
  },
  key: {
    up:     { is_down: false, pressed: false, was_down: false },
    down:   { is_down: false, pressed: false, was_down: false },
    left:   { is_down: false, pressed: false, was_down: false },
    right:  { is_down: false, pressed: false, was_down: false },
    enter:  { is_down: false, pressed: false, was_down: false },
    escape: { is_down: false, pressed: false, was_down: false },
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

  if (game_state == game_states.START_MENU)
    start_menu_loop(dt);
  else if (game_state == game_states.CHARACTER_SELECT)
    character_select_loop(dt);
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

  init_entities();

  init_character_select();

  reset_round_girl();
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
  round_girl.speed = 0.478;
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

    
    // draw horseshoe

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


function update_new_round(dt) {
  // update round girl's position
  round_girl.x += round_girl.speed * dt;

  if (round_girl.x > canvas.width) {
    turn_state = game_states.HORIZONTAL_POSITION;
    players[0].active = true;
    reset_player_positions();
  }
}

function update_horizontal_position(dt) {
  for (var i=0; i<players.length; i++) {
    if (!players[i].active) continue;
    var character = characters[players[i].character_id];
    players[i].x = input.mouse.x - character.width/2; 
  }

  if (input.mouse.button_left.pressed) {
    turn_state = game_states.ANGLE_SELECT;
  }
}

function update_angle_select(dt) {

}

function update_throwing(dt) {

}


/***************************************************************************
 ***************************************************************************/

run();


}
