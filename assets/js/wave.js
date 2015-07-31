/*jslint browser: true, devel: true*/
/*jslint browser: true, devel: true*/
// Global Helpers
function angleToVector(ang) {
    return [Math.cos(ang), Math.sin(ang)];
}

function dist(point1, point2) {
    return Math.sqrt(Math.pow((point1[0] - point2[0]), 2) +
                     Math.pow((point1[1] - point2[1]), 2));
}

function vectorMagnitude(vector) {
    return dist(vector, [0,0]);
}


function randomDirection() {
    return [Math.random(), Math.random()];
}

function angleBetweenVectors(vector1, vector2) {
    var x1 = vector1[0];
    var y1 = vector1[1];
    var x2 = vector2[0];
    var y2 = vector2[1];
    var topCalculation = x1 * x2 + y1 * y2;
    var bottomCalculation = vectorMagnitude(vector1) * vectorMagnitude(vector2);

    return Math.acos(topCalculation / bottomCalculation);
}

Array.prototype.diff = function(array) {
    return this.filter(function(baseMember) {return array.indexOf(baseMember) < 0;});
};

// Image Info Class
(function() {
	// Class definition with private attributes / methods
	// var _ = this.ImageInfo = function(url, center, size, radius, framesNum) {
	var _ = this.ImageInfo = function(url, leftCorner, frameSize, collide, rotation, framesNum) {
		this.url = url;
		this.leftCorner = typeof leftCorner !== 'undefined' ? leftCorner : [0, 0];
        this.frameSize = frameSize;
        this.collide = (collide === true);
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
	var _ = this.Sprite = function(game, x, y, dx, dy, angle, angularVelocity, imageInfo, sound, playSound, friction, scale, owner, static, opacity, lifespan) {
        this.game = game;
        
		this.position = [x, y]; // copy
        this.imageInfo = imageInfo;

        this.scale = typeof scale !== 'undefined' ? scale : 1;

        this.age = 0;
        this.lifespan = typeof lifespan !== 'undefined' ? lifespan : Infinity;
        this.opacity = typeof opacity !== 'undefined' ? opacity : 1;

        if (typeof sound !== 'undefined') {
            this.sound = sound;
            // Need to see what's an audio object
            // this.sound.set_volume(0.1)
            // sound.rewind()
            if (typeof playSound === true) {
            //     sound.play()
            }
        }
        this.owner = owner;
        this.static = !!static;

        if (this.static) {
            this.velocity = [0, 0]; // copy
            this.angularVelocity = 0;
            this.friction = 1;
        }
        else {
            this.velocity = [dx, dy]; // copy
            this.angularVelocity = angularVelocity;
            this.friction = typeof friction !== 'undefined' ? friction : 1.00;
        }
        
        this.angle = angle;
        
        this.updateFunctions = [updatePosition, updateAngle, updateVelocity];
        this.accelerationFunctions = [];
        this.collisionFunctions = [];
	};

	// Private Methods
    function updatePosition(sprite) {
        var velocity = sprite.getVelocity();
        var dx = velocity[0];
        var dy = velocity[1];

        var oldPosition = sprite.getPosition();

        var game = sprite.getGame();
        var width = game.getWidth();
        var height = game.getHeight();
        var overflow = game.getOverflow();

        var x = (width + oldPosition[0] + overflow + dx) % width;
        var y = (height + oldPosition[1] + overflow + dy) % height;

        // The x,y coordinates for the game start a little outside the canvas
        sprite.setPosition(x - overflow, y - overflow);
    }
    
	function updateAngle(sprite) {
		var newAngle = sprite.getAngle() + sprite.getAngularVelocity();
    	sprite.setAngle(newAngle);
	}
	
	function updateVelocity(sprite) {
        var numAccelerationFunc = sprite.accelerationFunctions.length;
		for (var i = 0; i < numAccelerationFunc; ++i) {
			sprite.accelerationFunctions[i](sprite);
		}

		var velocity = sprite.getVelocity();
		var dx = velocity[0];
		var dy = velocity[1];
	    var friction = sprite.getFriction();
	    sprite.setVelocity(dx * friction, dy * friction);
	}

	// Private members
    var drawImage = function(canvas, image, opacity, frameCenter, frameSize,
                              destinationCenter, destinationSize, rotation) {
        // Set the global opacity
        var context = canvas.getContext("2d");
        context.globalAlpha = opacity; 
        context.save();
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
        context.drawImage(image,
                          frameCenter[0] - frameSize[0] / 2,
                          frameCenter[1] - frameSize[1] / 2,
                          frameSize[0], frameSize[1],
                          -(destinationSize[0] / 2),
                          -(destinationSize[1] / 2),
                          destinationSize[0], destinationSize[1]);

        // restore the co-ords and opacity to how they were when we began
        context.globalAlpha = 1; 
        context.restore();
    };
	
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
        setOpacity: function(opacity) {
            this.opacity = opacity;
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
			return this.scale * 1/5 * (size[0] + size[1]);
		},
	    getGame: function() {
			return this.game;
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
        getAge: function() {
			return this.age;
		},
        getOpacity: function() {
            return this.opacity;
        },
        getLifespan: function() {
            return this.lifespan;
        },
	    isSpriteDead: function() {
	    	++this.age;
			return this.getAge() > this.getLifespan();
		},
        isStatic: function() {
            return this.static;
        },
        getScale: function() {
            return this.scale;
        },
		update: function() {
            ++this.age;
            var numUpdateFunc = this.updateFunctions.length;
            for (var i = 0; i < numUpdateFunc; ++i) {
                this.updateFunctions[i](this);
            }
		},
		draw: function(canvas) {
			var frameSize = this.imageInfo.getFrameSize();
	        var frameCenter = this.imageInfo.getOriginFrameCenter();
    		var newFrameCenter = frameCenter;
    		var framesNum = this.imageInfo.getFramesNum();

	        if (this.imageInfo.isAnimated()) {
	           	newFrameCenter = [frameCenter[0] + frameSize[0] * ((this.age - 1) % framesNum),
	        					  frameCenter[1]]; 
	        }

	        var destinationCenter = this.position;
	        var destinationSize = [frameSize[0] * this.scale,  frameSize[1] * this.scale];

	        var rotation = this.angle;
            var overflow = this.game.getOverflow();
            var radius = this.getRadius() + overflow;
            
            var canvasWidth = this.game.getWidth();
            var canvasHeight = this.game.getHeight();
            
            var image = this.imageInfo.createImgElement();
            var opacity = this.opacity;

			drawImage(canvas, image, opacity, newFrameCenter, frameSize, destinationCenter,
                      destinationSize, rotation);
            
            if (destinationCenter[0] - radius < -overflow) {
                var rightReflection = [destinationCenter[0] + canvasWidth,
                                       destinationCenter[1]];
                drawImage(canvas, image, opacity, newFrameCenter, frameSize, rightReflection,
                          destinationSize, rotation);
            }
            
            if (destinationCenter[0] + radius > canvasWidth + overflow) {
                var leftReflection = [destinationCenter[0] - canvasWidth,
                                      destinationCenter[1]];
                drawImage(canvas, image, opacity, newFrameCenter, frameSize, leftReflection,
                          destinationSize, rotation);
            }
            
            if (destinationCenter[1] - radius < -overflow) {
                var bottomReflection = [destinationCenter[0],
                                        destinationCenter[1] + canvasHeight];
                drawImage(canvas, image, opacity, newFrameCenter, frameSize, bottomReflection,
                          destinationSize, rotation);
                    
            }
            if (destinationCenter[1] + radius > canvasHeight + overflow) {
                var topReflection = [destinationCenter[0],
                                     destinationCenter[1] - canvasHeight];
                drawImage(canvas, image, opacity, newFrameCenter, frameSize, topReflection,
                          destinationSize, rotation);
            }
		},
        handleCollision: function(otherSprite) {
            var numCollisionFuncs = this.collisionFunctions.length;
            for (var i = 0; i < numCollisionFuncs; ++i) {
                this.collisionFunctions[i](this, otherSprite);
            }
        }
	};
})();


// Ripple Class
(function() {
	// Class definition with private attributes / methods
	var _ = this.Ripple = function(owner, opacity) {
        var position = owner.getPosition();
        var velocity = owner.getVelocity();
        var velocityMagnitude = vectorMagnitude(velocity);
        var velocityVector = [velocity[0] / velocityMagnitude,
                              velocity[1] / velocityMagnitude];
        var radius = owner.getRadius();
        var x = position[0] - velocityVector[0] * radius;
        var y = position[1] - velocityVector[1] * radius;
        var imageInfo = owner.getRippleImageInfo();
        var dx = 0;
        var dy = 0;
        var scale = radius * owner.getScale() * velocityMagnitude / 2000;
        opacity = velocityMagnitude / 6 > opacity ? 3 / velocityMagnitude : opacity;
        var ownerAngle = owner.getAngle();
        var forward = owner.getForwardVector();
        var angle = ownerAngle - angleBetweenVectors(forward, velocity);
        var angularVelocity = 0;
        var sound = null;
        var playSound = false;
        var friction = 1;
        var static = true;
        var lifespan = 60;
		Sprite.call(this, owner.getGame(), x, y, dx, dy, angle, angularVelocity, imageInfo, 
                    sound, playSound, friction, scale, owner, static, opacity, lifespan);

        this.updateFunctions.push(expand);
        this.updateFunctions.push(fadeOut);
        this.game.addRipple(this);
        this.initialOpacity = this.opacity;
	};

	// Private Methods
    var expand = function(ripple) {
        var newScale = ripple.getScale() + 0.01;
		ripple.setScale(newScale);
	};
    var fadeOut = function(ripple) {
        var oldOpacity = ripple.getOpacity();
        var newOpacity = oldOpacity * 0.8;
		ripple.setOpacity(newOpacity);
	};

    _.prototype = new Sprite;
    _.prototype.getInitialOpacity = function() {
        return this.initialOpacity;
    };
})();


// Player Class
(function() {
	// Class definition with private attributes / methods
	var _ = this.Player = function(game, x, y, dx, dy, angle, imageInfo, thrustImageInfo, rippleImageInfo, speed, friction, scale, sound, thrustsound, thrustOnMap, turnLeftMap, turnRightMap) {
		Sprite.call(this, game, x, y, dx, dy, angle, 0, imageInfo, sound, false, friction, scale);
		this.noThrustImageInfo = imageInfo;
        this.thrustImageInfo = thrustImageInfo;
        this.rippleImageInfo = rippleImageInfo;
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
        this.updateFunctions.push(addRipple);
        this.accelerationFunctions.push(thrustAcceleration);
        this.updateScaleFunctions = [];
        
        this.ripplePacity = 0.5;
	};

	_.prototype = new Sprite;

	// Private Methods
    function updateScale(player) {
        var numUpdateScaleFuncs = player.updateScaleFunctions.length;
		for (var i = 0; i < numUpdateScaleFuncs; ++i) {
			player.updateScaleFunctions[i](player);
		}
	}
    
    function addRipple(player) {
        var velocity = player.getVelocity();
        var velocityMagnitude = vectorMagnitude(velocity);
        if (velocityMagnitude > 0.1) {
            new Ripple(player, 0.5);
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
    _.prototype.init = function() {
        this.game.addPlayer(this);
    };
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
    _.prototype.getSpeed = function() {
		return this.speed;
	};
    _.prototype.getRippleImageInfo = function() {
        return this.rippleImageInfo;
    };
    _.prototype.getRippleOpacity = function() {
        return this.ripplePacity;
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
})();

// Surfer Class
(function() {
	// Class definition with private attributes / methods
	var _ = this.Surfer = function(game, position, scale) {
		var url = "./assets/images/PlayerSurfer.svg";
		
		var surferInfo = new ImageInfo(url, [0,0], [90, 90], true, - 90/360 * 2*Math.PI);
        var surferThrustInfo = new ImageInfo(url, [0,0], [90, 90], true, -90/360 * 2*Math.PI);
        
        var rippleUrl = "./assets/images/Ripple Half.svg";
        var rippleImageInfo = new ImageInfo(rippleUrl, [0,0], [500, 300], false, -90/360 * 2*Math.PI);

        var sound = "Not Implemented";
        var thrustsound = "Not Implemented";

        var x = position[0];
        var y = position[1];
        var dx = 0;
        var dy = 0;
        var angle = 0;

        var friction = 0.9;

        var speed = 1.5;

		Player.call(this, game, x, y, dx, dy, angle, surferInfo, surferThrustInfo, rippleImageInfo, speed, friction, scale, sound, thrustsound, 'Up', 'Left', 'Right');

		var surfer = this;
		this.keyDownMapping["U+0020"] = surfer.jump; // TODO: implement
        this.collisionFunctions.push(collisionBump);
        
        this.init();
	};

	_.prototype = new Player;

	// Private methods
    function collisionBump(player, otherSprite) {
        var ratio = otherSprite.getRadius() / player.getRadius();
        var collisionDirection = otherSprite.getForwardVector();
        
        var oldVelocity = player.getVelocity();
        
        if (otherSprite.isStatic()) {
            player.setVelocity(-oldVelocity[0], -oldVelocity[1]);
        }
        else {
            player.setVelocity((oldVelocity[0] + ratio * player.speed * collisionDirection[0]), 
                               (oldVelocity[1] + ratio * player.speed * collisionDirection[1]));
        }
    }
	
	// Public methods
	_.prototype.jump = function(surfer) {
		console.log(surfer);
		return;
	};
})();

// Monster Class
(function() {
	// Class definition with private attributes / methods
	var _ = this.Monster = function(game, position, scale) {
		var url = "./assets/images/PlayerMonster.svg";
		
		var monsterInfo = new ImageInfo(url, [0,0], [270, 270], true, 90/360 * 2*Math.PI);
        var monsterThrustInfo = new ImageInfo(url, [0,0], [270, 270], true, 90/360 * 2*Math.PI);
        
        var rippleUrl = "./assets/images/Ripple full.svg";
        var rippleImageInfo = new ImageInfo(rippleUrl, [0,0], [500, 600], false, 0);

        var sound = "Not Implemented";
        var thrustsound =  "Not Implemented";

        var x = position[0];
        var y = position[1];
        var dx = 0;
        var dy = 0;
        var angle = 0;

        var friction = 0.992;

        var speed = 0.2;

		Player.call(this, game, x, y, dx, dy, angle, monsterInfo, monsterThrustInfo, rippleImageInfo, speed, friction, scale, sound, thrustsound, 'U+0057', 'U+0041', 'U+0044');

		var monster = this;
		this.keyDownMapping["Shift"] = monster.eat; // TODO: implement
        
        this.updateScaleFunctions.push(velocityScale);
        this.accelerationFunctions.push(dontStopAcceleration);
        this.collisionFunctions.push(shoreCollision);
        
        this.init();
	};

	_.prototype = new Player;

	// Private methods
    function velocityScale(monster) {
        var vectorSize = vectorMagnitude(monster.getVelocity());
        monster.setScale(monster.baseScale + vectorSize / 100);
    }
    
    function shoreCollision(monster, otherSprite) {
        if (otherSprite.isStatic()) {
            var oldVelocity = monster.getVelocity();
            var dx = -oldVelocity[0];
            var dy = -oldVelocity[1];
            monster.setVelocity(dx, dy);
//            var distanceFromShore = dist(monster, otherSprite);
//            var approachRadius = this.monster.getRadius() * 2;
//            if (distanceFromShore < approachRadius) {
//                var ratio = approachRadius / distanceFromShore;
//                var speed = monster.getSpeed;
//                var forward = monster.getForwardVector();
//                var dfx = forward[0];
//                var dfy = forward[1];
//                
//                var dx = oldVelocity[0] - dfx * ratio * speed;
//                var dy = oldVelocity[1] - dfy * ratio * speed;
//                
//            }
            
        }
    }
	
    function dontStopAcceleration(monster) {
		var velocity = monster.getVelocity();
		var dx = velocity[0];
		var dy = velocity[1];
		var forward = monster.getForwardVector();
        var dfx = forward[0];
        var dfy = forward[1];

        var speed = monster.getSpeed();
        
        var ratio = (vectorMagnitude(forward) + 1) / (vectorMagnitude(velocity) + 1);
        
        dx += dfx * speed * ratio;
        dy += dfy * speed * ratio;

	    monster.setVelocity(dx, dy);
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
        this.obstacles = [];
        this.ripples = [];
		this.difficulty = 1;
        this.overflowCanvas = 0;

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
		getWidth: function() {
			return this.gameCanvas.width + 2 * this.overflowCanvas;
		},
        getHeight: function() {
			return this.gameCanvas.height + 2 * this.overflowCanvas;
		},
        getOverflow: function() {
            return this.overflowCanvas;
        },
        checkSpriteCoupleCollision: function(sprite1, sprite2) {
            // check distance while considering the wrapping nature of the game.
			var distance = dist(sprite1.getPosition(), sprite2.getPosition());
			return distance < (sprite1.getRadius() + sprite2.getRadius());
		},
		spriteCollisionsWithArray: function(array, sprite) {
            var arrayLen = array.length;
		    for (var i = 0; i < arrayLen ; ++i) {
		    	var otherSprite = array[i];
		        if (sprite != otherSprite && this.checkSpriteCoupleCollision(sprite, otherSprite)) {
	                sprite.handleCollision(otherSprite);
		        }
		    }
		},
		randomMapPoint: function(radius) {
		    // Return a random point not colliding with another player or object
		    var randomPoint = [Math.random() * this.getWidth(),
                               Math.random() * this.getHeight()];
		    var draw = true;

            var playersNum = this.players.length;
		    for (var i = 0; i < playersNum; ++i) {
    			var player = this.players[i];
		        if (dist(player.getPosition(), randomPoint) < 2 * (player.getRadius() + radius)) {
		            draw = false;
		        }
		    }

		    if (draw) {
		        return randomPoint;
		    } else {
		        return this.randomMapPoint(radius);
		    }
		},
		assignKeyDownEventListeners: function() {
			var game = this;

            var playersNum = this.players.length;
			for (var i = 0; i < playersNum; ++i) {
        		var player = game.players[i];
        		document.addEventListener("keydown", player.createKeyDownListener());
        	}
		},
		assignKeyUpEventListeners: function() {
			var game = this;

            var playersNum = this.players.length;
			for (var i = 0; i < playersNum; ++i) {
        		var player = game.players[i];
        		document.addEventListener("keyup", player.createKeyUpListener());
        	}
		},
		init: function(difficulty) {
            var game = this;
            new Surfer(game, this.randomMapPoint(), this.playerScale);
            new Monster(game, this.randomMapPoint(), this.playerScale / 2);

	        this.started = true;
	        this.startTime = this.time;
	        this.difficulty = difficulty;
	        this.result = "";

	        this.assignKeyDownEventListeners();
	        this.assignKeyUpEventListeners();
		},
        addPlayer: function(player) {
            this.players.push(player);
            this.overflowCanvas = Math.max(this.overflowCanvas, player.getRadius());
        },
        addRipple: function(ripple) {
            this.ripples.push(ripple);
        },
		drawAll: function() {
			this.gameCanvas.getContext('2d').clearRect(0, 0, this.gameCanvas.width,
                                                             this.gameCanvas.height);

            var player;
            var i;
            var playersNum = this.players.length;
            
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

		        this.gameCanvas.drawImage(splashInfo.url, 0, 0, 400, 300, 0, 0,
                                          this.gameCanvas.width, this.gameCanvas.height);
		    } else {
		    	// draw and the player and sprites
		        for (i = 0; i < playersNum; ++i) {
    				player = this.players[i];
		            player.draw(this.gameCanvas);
		        }
                
                // draw ripples
                var ripplesNum = this.ripples.length;
                for (i = 0; i < ripplesNum; ++i) {
    				var ripple = this.ripples[i];
		            ripple.draw(this.gameCanvas);
		        }
		    }
		},
		updateAll: function() {
			// animiate background
		    this.time += 1;
            var player;
            var i;
            var playersNum = this.players.length;

		    if (this.started) {
		        // deal with colisions
		        for (i = 0; i < playersNum; ++i) {
    				player = this.players[i];
    				player.update();

                    this.spriteCollisionsWithArray(this.players, player);

		            // check to see if any player lost
					if (player.lives === 0) {
		                this.started = false;
					}
		        }
                
                var oldRipples = this.ripples;
                var rippleNum = oldRipples.length;
                this.ripples = [];

                for (i = 0; i < rippleNum; ++i) {
                    var ripple = oldRipples[i];
                    ripple.update();
                    if (!ripple.isSpriteDead()) {
                        this.ripples.push(ripple);
                    }
                }
		    }
            
            if (!this.started) {
                for (i = 0; i < playersNum; ++i) {
                    player = this.players[i];
                    console.log(player);
                }
            }
		},
	    reset: function() {
	    	this.players = [];
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
			this.game = new Game(this.gameCanvas, 0.3, 1, 30);
			this.game.init(1);
			// TODO: should show splash screen
		}
	};
})();

var c = document.getElementById("gameCanvas");
c.width = document.documentElement.clientWidth - 10;
c.height = document.documentElement.clientHeight - 10;
this.view = new View(c, 25);
this.view.initGame();