// Global Helpers
function angleToVector(ang) {
    return [Math.cos(ang), Math.sin(ang)];
}

function dist(point1, point2) {
    return Math.sqrt(Math.pow((point1[0] - point2[0]), 2) + Math.pow((point1[1] - point2[1]), 2));
}

function vectorMagnitude(vector) {
    return dist(vector, [0,0]);
}


function randomDirection() {
    return [Math.random(), Math.random()];
}

Array.prototype.diff = function(array) {
    return this.filter(function(baseMember) {return array.indexOf(baseMember) < 0;});
};

// Image Info Class
(function() {
	// Class definition with private attributes / methods
	// var _ = this.ImageInfo = function(url, center, size, radius, lifespan, framesNum) {
	var _ = this.ImageInfo = function(url, leftCorner, frameSize, collide, rotation, lifespan, framesNum) {
		this.url = url;
		this.leftCorner = typeof leftCorner !== 'undefined' ? leftCorner : [0, 0];
        this.frameSize = frameSize;
        this.collide = (collide === true);
        this.lifespan = typeof lifespan !== 'undefined' ? lifespan : Infinity;
        this.framesNum = typeof framesNum !== 'undefined' ? framesNum : 1;
        this.rotation = rotation;
	};

	// Helpers

	// Scope constants
	
	// Public methods
	_.prototype = {
	    getOriginFrameCenter: function() {
	        return [this.leftCorner[0] + this.frameSize[0] / 2,
	        		this.leftCorner[1] + this.frameSize[1] / 2];
		},
	    getFrameSize: function() {
	        return this.frameSize;
		},
		getRotation: function() {
	        return this.rotation;
		},
	    isCollide: function() {
	    	return this.collide;
		},
	    getLifespan: function() {
	        return this.lifespan;
		},
		getFramesNum: function() {
			return this.framesNum;
		},
	    isAnimated: function() {
	        return this.framesNum > 1;
		},
		createImgElement: function() {
			var img = document.createElement("img");
    		img.src=this.url;
    		img.infoObject = this;
			return img; 
		}
	};
})();

// Sprite Class
(function() {
	// Class definition with private attributes / methods
	var _ = this.Sprite = function(x, y, dx, dy, angle, angularVelocity, imageInfo, sound, playsound, friction, scale, owner, static) {
		this.position = [x, y]; // copy
        this.imageInfo = imageInfo;

        this.scale = typeof scale !== 'undefined' ? scale : 1;

        this.age = 0;
        if (typeof sound !== 'undefined') {
            this.sound = sound;
            // Need to see what's an audio object
            // this.sound.set_volume(0.1)
            // sound.rewind()
            if (typeof playsound === true) {
            //     sound.play()
            }
        }
        this.owner = owner;
        this.static = !!static;

        if (this.static) {
            this.velocity = [0, 0]; // copy
            this.angle = 0;
            this.angularVelocity = 0;
            this.friction = 1;
        }
        else {
            this.velocity = [dx, dy]; // copy
            this.angle = angle;
            this.angularVelocity = angularVelocity;
            this.friction = typeof friction !== 'undefined' ? friction : 1.00;
        }
        
        this.accelerationFunctions = [];
        this.updateFunctions = [updateAngle, updateVelocity];
        
        
	};

	// Private Methods
	function updateAngle(sprite) {
		var newAngle = sprite.getAngle() + sprite.getAngularVelocity();
    	sprite.setAngle(newAngle);
	}
	
	function updateVelocity(sprite) {
		for (var i = 0; i < sprite.accelerationFunctions.length; ++i) {
			sprite.accelerationFunctions[i](sprite);
		}

		var velocity = sprite.getVelocity();
		var dx = velocity[0];
		var dy = velocity[1];
	    var friction = sprite.getFriction();
	    sprite.setVelocity(dx * friction, dy * friction);
	}

	// Scope constants
	
	// Public methods
	_.prototype = {
		setPosition: function(x, y) {
			this.position = [x, y];
		},
		setVelocity: function(dx, dy) {
            if (this.static) {
                return;
            }
			this.velocity = [dx, dy];
		},
		setScale: function(newScale) {
			this.scale = newScale;
		},
		setAngle: function(newAngle) {
            if (this.static) {
                return;
            }
			this.angle = newAngle;
		},
		getForwardVector: function() {
            if (this.static) {
                return [0,0];
            }
			return angleToVector(this.angle + this.imageInfo.getRotation());
		},
		getPosition: function() {
			return this.position;
		},
		getVelocity: function() {
			return this.velocity;
		},
		getFriction: function() {
			return this.friction;
		},
		getAngle: function() {
			return this.angle;
		},
		getAngularVelocity: function() {
			return this.angularVelocity;
		},
		getRadius: function() {
			if (!this.imageInfo.isCollide()) {
				return 0;
			}
			var size = this.imageInfo.frameSize;
			return this.scale * 1/4 * (size[0] + size[1]);
		},
	    getOwner: function() {
			return this.owner;
		},
	    getTip: function() {
	    	var forward = this.getForwardVector();
	    	var imageSize = this.imageInfo.getFrameSize();
	        return [this.pos[0] + (imageSize[0] / 2 * forward[0] * this.scale),
        			this.pos[1] + (imageSize[1] / 2 * forward[1] * this.scale)];
		},
	    isSpriteDead: function() {
	    	++this.age;
			return this.age > this.lifespan;
		},
        isStatic: function() {
            return this.static;
        },
		update: function() {
            if (this.static) {
                return;
            }
			for (var i = 0; i < this.updateFunctions.length; ++i) {
				this.updateFunctions[i](this);
			}
		},
		draw: function(canvas) {
			var context = canvas.getContext("2d");
			context.save();

			var frameSize = this.imageInfo.getFrameSize();
	        var frameCenter = this.imageInfo.getOriginFrameCenter();
    		var newFrameCenter = frameCenter;
//    		var framesNum = this.imageInfo.getFramesNum();

	        if (this.imageInfo.isAnimated()) {
	           	newFrameCenter = [frameCenter[0] + frameSize[0] * ((this.age - 1) % this.imageInfo.getFramesNum()),
	        					  frameCenter[1]]; 
	        }

	        var destinationCenter = this.position;
	        var destinationSize = [frameSize[0] * this.scale,  frameSize[1] * this.scale];

	        var rotation = this.angle;

			// context.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)

			// img	Source image
			// sx	Source x
			// sy	Source y
			// sw	Source width
			// sh	Source height
			// dx	Destination x
			// dy	Destination y
			// dw	Destination width
			// dh	Destination height

			// move to the middle of where we want to draw our image
			context.translate(destinationCenter[0], destinationCenter[1]);
		 
			// rotate around that point (in radians) 
			context.rotate(rotation);

			// draw it up and to the left by half the width and height of the image 
			context.drawImage(this.imageInfo.createImgElement(),
							  newFrameCenter[0] - frameSize[0] / 2, newFrameCenter[1] - frameSize[1] / 2,
							  frameSize[0], frameSize[1],
							  -(destinationSize[0] / 2), -(destinationSize[1] / 2),
							  destinationSize[0], destinationSize[1]);
		 
			// and restore the co-ords to how they were when we began
			context.restore(); 
		}
	};
})();

// Player Class
(function() {
	// Class definition with private attributes / methods
	var _ = this.Player = function(x, y, dx, dy, angle, imageInfo, thrustImageInfo, speed, friction, scale, sound, thrustsound, thrustOnMap, turnLeftMap, turnRightMap) {
		Sprite.call(this, x, y, dx, dy, angle, 0, imageInfo, sound, false, friction, scale);
		this.noThrustImageInfo = imageInfo;
        this.thrustImageInfo = thrustImageInfo;
        this.score = 0;
        this.lives = 3;
        this.baseScale = this.scale;
        this.speed = speed;

        var player = this;
        this.keyDownMapping = {};
        this.keyDownMapping[thrustOnMap] = player.thrustOn;
        this.keyDownMapping[turnRightMap] = player.turnRight;
        this.keyDownMapping[turnLeftMap] = player.turnLeft;

		this.keyUpMapping = {};
        this.keyUpMapping[thrustOnMap] = player.thrustOff;
        this.keyUpMapping[turnRightMap] = player.stopTurn;
        this.keyUpMapping[turnLeftMap] = player.stopTurn;

        this.updateFunctions.push(updateScale);
        this.accelerationFunctions.push(thrustAcceleration);
        this.updateScaleFunctions = [];
	};

	_.prototype = new Sprite;

	// Private Methods
    function updateScale(player) {
		for (var i = 0; i < player.updateScaleFunctions.length; ++i) {
			player.updateScaleFunctions[i](player);
		}
	}
    
	function thrustAcceleration(player) {
		var velocity = player.getVelocity();
		var dx = velocity[0];
		var dy = velocity[1];
		var forward = player.getForwardVector();

	    if (player.isThrust && player.isThrust()) {
	        dx += forward[0] * player.speed;
	        dy += forward[1] * player.speed;
	    }

	    player.setVelocity(dx, dy);
	}
	
	// Public methods
	_.prototype.turnRight = function(player) {
		player.angularVelocity = 0.1;
	};
	_.prototype.turnLeft = function(player) {
		player.angularVelocity = -0.1;
	};
	_.prototype.stopTurn = function(player) {
		player.angularVelocity = 0;
	};
	_.prototype.thrustOn = function(player) {
		player.thrust = true;
        player.imageInfo = player.thrustImageInfo;
        // player.sound.play(player);
	};
	_.prototype.thrustOff = function(player) {
		player.thrust = false;
        player.imageInfo = player.noThrustImageInfo;
        // player.sound.play(player);
	};
	_.prototype.isThrust = function() {
		return this.thrust;
	};
	_.prototype.createKeyDownListener = function() {
		var player = this;
		return function(e) {
			var key = e.keyIdentifier;
			if (key in player.keyDownMapping) {
				player.keyDownMapping[key](player);
			}
		};
	};
	_.prototype.createKeyUpListener = function() {
		var player = this;
		return function(e) {
			var key = e.keyIdentifier;
			if (key in player.keyUpMapping) {
				player.keyUpMapping[key](player);
			}
		};
	};
	_.prototype.collisionBump = function(collisionDirection, ratio, sprite) {
        if (sprite.isStatic()) {
            this.setVelocity(-oldVelocity[0], 
                             -oldVelocity[1]);
        }
		var oldVelocity = this.getVelocity();
		this.setVelocity((oldVelocity[0] + ratio * this.speed * collisionDirection[0]), 
						 (oldVelocity[1] + ratio * this.speed * collisionDirection[1]));
	};
})();

// Surfer Class
(function() {
	// Class definition with private attributes / methods
	var _ = this.Surfer = function(position, scale) {
		var url = "./assets/images/PlayerSurfer.svg";
		
		var surferInfo = new ImageInfo(url, [0,0], [90, 90], true, - 90/360 * 2*Math.PI);
        var surferThrustInfo = new ImageInfo(url, [0,0], [90, 90], true, -90/360 * 2*Math.PI);

        var sound = "Not Implemented";
        var thrustsound = "Not Implemented";

        var x = position[0];
        var y = position[1];
        var dx = 0;
        var dy = 0;
        var angle = 0;

        var friction = 0.9;

        var speed = 1.5;

		Player.call(this, x, y, dx, dy, angle, surferInfo, surferThrustInfo, speed, friction, scale, sound, thrustsound, 'Up', 'Left', 'Right');

		var surfer = this;
		this.keyDownMapping["U+0020"] = surfer.jump; // TODO: implement
	};

	_.prototype = new Player;

	// Helpers

	// Scope constants
	
	// Public methods
	_.prototype.jump = function(surfer) {
		console.log(surfer);
		return;
	};
})();

// Monster Class
(function() {
	// Class definition with private attributes / methods
	var _ = this.Monster = function(position, scale) {
		var url = "./assets/images/PlayerMonster.svg";
		
		var monsterInfo = new ImageInfo(url, [0,0], [270, 270], true, 90/360 * 2*Math.PI);
        var monsterThrustInfo = new ImageInfo(url, [0,0], [270, 270], true, 90/360 * 2*Math.PI);

        var sound = "Not Implemented";
        var thrustsound =  "Not Implemented";

        var x = position[0];
        var y = position[1];
        var dx = 0;
        var dy = 0;
        var angle = 0;

        var friction = 0.99;

        var speed = 0.4;

		Player.call(this, x, y, dx, dy, angle, monsterInfo, monsterThrustInfo, speed, friction, scale, sound, thrustsound, 'U+0057', 'U+0041', 'U+0044');

		var monster = this;
		this.keyDownMapping["Shift"] = monster.eat; // TODO: implement
        
        this.updateScaleFunctions.push(velocityScale);
        this.accelerationFunctions.push(dontStopAcceleration);
	};

	_.prototype = new Player;

	// Private methods
    function velocityScale(monster) {
        var vectorSize = dist([0,0], monster.getVelocity());
        monster.setScale(monster.baseScale + vectorSize / 100);
    }
	
    function dontStopAcceleration(player) {
		var velocity = player.getVelocity();
		var dx = velocity[0];
		var dy = velocity[1];
		var forward = player.getForwardVector();
        var dfx = forward[0];
        var dfy = forward[1];

        var ratio = (vectorMagnitude(forward) + 1) / (vectorMagnitude(velocity) + 1);
        
        dx += dfx * player.speed * ratio;
        dy += dfy * player.speed * ratio;

	    player.setVelocity(dx, dy);
	}
    
	// Public methods
	_.prototype.eat = function(monster) {
		console.log(monster);
		return;
	};
})();

// Game Logic
(function(document) {
	// Class definition with private attributes / methods
	var _ = this.Game = function(gameCanvas, playerScale, FPS) {
		this.started = false;
		this.startTime = 0;	
		this.time = 0;
		this.FPS = FPS;
		// missile_speed = 8
		this.gameCanvas = gameCanvas;
		this.playerScale = playerScale; // = 0.7
		this.result = "";
		this.players = [];
		this.width = this.gameCanvas.width;
		this.height = this.gameCanvas.height;
		this.difficulty = 1;

		var game = this;

        this.mainGameLoop = setInterval(function() {
			game.updateAll();
			game.drawAll();
			if (!game.started) {
				game.reset();
				clearInterval(game.mainGameLoop);
			}
		}, 60 / FPS);
	};

	// Scope constants

	// Public methods
	_.prototype = {
		// collision handlers
		collide: function(sprite1, sprite2) {
			var distance = dist(sprite1.getPosition(), sprite2.getPosition());
			return distance < (sprite1.getRadius() + sprite2.getRadius());
		},
		checkCollisionsWithArray: function(array, checkedObject, removeFromArray) {
		    var removalArray = array([]);
		    for (var i = 0; i < array.length ; ++i) {
		    	var member = array[i];
		        if (member != checkedObject && this.collide(member, checkedObject)) {
	                removalArray.add(member);
		        }
		    }

		    if (removeFromArray === true) {
		    	array.diff(removalArray);
		    }

		    return removalArray.length;
		},
		checkCollisionsBetweenArrays: function(baseArray, otherArray) {
		    var removalArray = [];

		    for (var i = 0; i < baseArray.length; ++i) {
		    	var member = baseArray[i];
		        if (this.checkCollisionsWithArray(otherArray, member, true) > 0) {
		            removalArray.add(member);
		        }
		    }

		    baseArray.diff(removalArray);
		},
		updateSpritePosition: function(sprite) {
			var velocity = sprite.getVelocity();
			var dx = velocity[0];
			var dy = velocity[1];

			var oldPosition = sprite.getPosition();

			var x = (this.width + 2 * sprite.getRadius() + oldPosition[0] + sprite.getRadius() + dx) % (this.width + 2 * sprite.getRadius());
	        var y = (this.height + 2 * sprite.getRadius() + oldPosition[1] + sprite.getRadius() + dy) % (this.height + 2 * sprite.getRadius());
	        sprite.setPosition(x - sprite.getRadius(), y - sprite.getRadius());
		},
		randomMapPoint: function(radius) {
		    // Return a random point not colliding with another player or object
		    var randomPoint = [Math.random() * this.width, Math.random() * this.height];
		    var draw = true;

		    for (var i = 0; i < this.players.length; ++i) {
    			var player = this.players[i];
		        if (dist(player.getPosition(), randomPoint) < 2 * (player.getRadius() + radius)) {
		            draw = false;
		        }
		    }
		    // for rock in rocks:
		    //     if dist(rock.pos,randomPoint) < 2 * (rock.get_radius() + radius):
		    //         draw = False
		    // for missile in missiles:
		    //     if dist(missile.pos,randomPoint) < 2 * (missile.get_radius() + radius):
		    //         draw = False 
		    if (draw) {
		        return randomPoint;
		    }
		    else {
		        return this.randomMapPoint(radius);
		    }
		},
		assignKeyDownEventListeners: function() {
			var game = this;

			for (var i = 0; i < game.players.length; ++i) {
        		var player = game.players[i];
        		document.addEventListener("keydown", player.createKeyDownListener());
        	}
		},
		assignKeyUpEventListeners: function() {
			var game = this;

			for (var i = 0; i < game.players.length; ++i) {
        		var player = game.players[i];
        		document.addEventListener("keyup", player.createKeyUpListener());
        	}
		},
		init: function(difficulty) {
			// timer.start()
	        // timer2.start()
	        this.players.push(new Surfer(this.randomMapPoint(), this.playerScale));
	        this.players.push(new Monster(this.randomMapPoint(), this.playerScale / 2));

	        this.started = true;
	        this.startTime = this.time;
	        // soundtrack.rewind()
	        // soundtrack.play()        
	        this.difficulty = difficulty;
	        this.result = "";

	        this.assignKeyDownEventListeners();
	        this.assignKeyUpEventListeners();
		},
		drawAll: function() {
			this.gameCanvas.getContext('2d').clearRect(0, 0, this.width, this.height);

            var player;
            var i;
            
			if (!this.started) {
		    	var splashImageURL = "http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/splash.png";
		    	var splashInfo = new ImageInfo(splashImageURL, [0, 0], [400, 300]);

				// context.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)

				// img	Source image
				// sx	Source x
				// sy	Source y
				// sw	Source width
				// sh	Source height
				// dx	Destination x
				// dy	Destination y
				// dw	Destination width
				// dh	Destination height

		        this.gameCanvas.drawImage(splashInfo.url, 0, 0, 400, 300, 0, 0, this.width, this.height);

		        for (i = 0; i < this.players.length; ++i) {
    				player = this.players[i];
			        //         player.sound.pause()
		        }
		        // canvas.draw_text(result, (5, HEIGHT * 0.05), font_size - 2, "White", "monospace")
		    } else {
		    	// draw and the player and sprites
		        for (i = 0; i < this.players.length; ++i) {
    				player = this.players[i];
		            player.draw(this.gameCanvas);
		            // // check to see if any player lost

			        if (!this.started) {
			        //         player.sound.pause()
			        }
		        }

		        // dead_rocks = set([])
		        // for rock in rocks:
		        //     if this.updateSpritePosition(rock):
		        //         rock.draw(canvas)
		        //     else:
		        //         dead_rocks.add(rock)
		        // rocks.difference_update(dead_rocks)
		        
		        // remove dead missiles
		        // dead_missiles = set([])    
		        // for missile in missiles:
		        //     if this.updateSpritePosition(missile):
		        //         missile.draw(canvas)
		        //     else:
		        //         dead_missiles.add(missile)
		        // missiles.difference_update(dead_missiles)

		        // remove dead explosions
		        // dead_explosions = set([])    
		        // for explosion in explosions:
		        //     if this.updateSpritePosition(explosion):
		        //         explosion.draw(canvas)
		            // else:
		            //     dead_missiles.add(explosion)
		        // explosions.difference_update(dead_missiles)
		        
		        		        // update lives and score
		        // for player in range(0,len(players)):
		        //     lives_text = "Player " + str(player + 1) +" Lives: " + str(players[player].lives)
		        //     lives_pos = (20, font_size * (player + 1))
		        //     canvas.draw_text(lives_text, lives_pos, font_size, "White", "monospace")
		            
		        //     score_text = "Player " + str(player + 1) +" Score: " + str(players[player].score)
		        //     score_text_pos = (WIDTH - 18 * len(score_text), font_size * (player + 1))
		        //     canvas.draw_text(score_text, score_text_pos, font_size, "White", "monospace")
		        
		        // score_text = "Score: " + str(players[player].score)
		    }
		},
		updateAll: function() {
			// animiate background
		    this.time += 1;
		    // center = debris_info.get_center()
		    // size = debris_info.get_size()
		    // wtime = (time / 8) % center[0];
		    // canvas.draw_image(debris_image, [center[0] - wtime, center[1]], [size[0] - 2 * wtime, size[1]], 
		                                // [WIDTH / 2 + 1.25 * wtime, HEIGHT / 2], [WIDTH - 2.5 * wtime, HEIGHT])
		    // canvas.draw_image(debris_image, [size[0] - wtime, center[1]], [2 * wtime, size[1]], 
		                                // [1.25 * wtime, HEIGHT / 2], [2.5 * wtime, HEIGHT])

		    // draw splash screen if not started
		    if (this.started) {
		        
		        // deal with colisions
		        // group_group_collide(missiles, rocks)
		        // group_group_collide(missiles, players)
		        // group_group_collide(rocks, rocks)
		        for (var i = 0; i < this.players.length; ++i) {
    				var player = this.players[i];
    				player.update();
		        	this.updateSpritePosition(player);
		        	// player.lives -= group_collide(rocks, player);
		            for (var j = 0; j < this.players.length; ++j) {
		            	var other_player = this.players[j];
		                if (other_player != player) {
		                    if (this.collide(player, other_player)) {
		                    	var ratio = other_player.getRadius() / player.getRadius();
                                
		                    	player.collisionBump(other_player.getForwardVector(), ratio, other_player);
		                        // player.score -= 1
		                    }
		                }
		            }

		        // // check to see if any player lost
					if (player.lives === 0) {
		                this.started = false;
					}
		        }
		    }
            
            if (!this.started) {
                for (var k = 0; k < this.players.length; ++k) {
                    var player = this.players[k];
                    // this.result += "Player " + str(player + 1) + " scored " + str(players[player].score) + " points! "
                }
                // timer.stop()
                // timer2.stop()
            }
		},
	    reset: function() {
	    	this.players = [];
	        // rocks = set([])
	        // missiles = set([])
	        // soundtrack.pause()
	        // soundtrack.rewind()
	    }
	};
})(document);

// View logic - recieves the HTML object and grid dimentions and draws the game board.
(function() {
	// Class definition with private attributes / methods
	var _ = this.View = function(gameCanvas, fontSize) {
		// Will hold a <table> element that will display the game's canvas
		this.gameCanvas = gameCanvas;
		this.fontSize = fontSize; // = 25
	};

	// Scope constants

	// Public methods
	_.prototype = {
		initGame: function() {
			this.game = new Game(this.gameCanvas, 0.3, 1, 60);
			this.game.init(1);
			// should show splash screen
		}
	};
})();

var c = document.getElementById("gameCanvas");
c.width = document.documentElement.clientWidth - 10;
c.height = document.documentElement.clientHeight - 10;
this.view = new View(c, 25);
this.view.initGame();