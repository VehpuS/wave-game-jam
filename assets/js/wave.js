/*jslint browser: true, devel: true*/

window.addEventListener("load", function() {
'use strict';
// Global Helpers
    let angleToVector = function(ang) {
        return [Math.cos(ang), Math.sin(ang)];
    };

    let dist = function(point1, point2) {
        return Math.sqrt(Math.pow((point1[0] - point2[0]), 2) +
                         Math.pow((point1[1] - point2[1]), 2));
    };

    let vectorMagnitude = function(vector) {
        return dist(vector, [0,0]);
    }


    let randomDirection = function() {
        return [Math.random(), Math.random()];
    }

    function angleBetweenVectors(vector1, vector2) {
        let x1 = vector1[0];
        let y1 = vector1[1];
        let x2 = vector2[0];
        let y2 = vector2[1];
        let topCalculation = x1 * x2 + y1 * y2;
        let bottomCalculation = vectorMagnitude(vector1) * vectorMagnitude(vector2);

        return Math.acos(topCalculation / bottomCalculation);
    }

    Array.prototype.diff = function(array) {
        return this.filter(function(baseMember) {return array.indexOf(baseMember) < 0;});
    };



    // Image Info Class
    let ImageInfo = (function() {
        // Class definition with private attributes / methods
        // let _ = this.ImageInfo = function(url, center, size, radius, framesNum) {
        let ImageInfo = function(url, leftCorner, frameSize, collide, rotation, framesNum) {
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
        ImageInfo.prototype = {
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
                let img = document.createElement("img");
                img.src=this.url;
                img.infoObject = this;
                return img;
            }
        };
        return ImageInfo;
    })();

    // Sprite Class
    let Sprite = (function() {
        // Class definition with private attributes / methods
        let Sprite = function(game, x_pos, y_pos, dx, dy, angle, angularVelocity, imageInfo, sound, playSound, friction, scale, owner, is_static, opacity, lifespan) {
            this.game = game;

            this.position = [x_pos, y_pos]; // copy
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
            this.static = !!is_static;

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
            let velocity = sprite.getVelocity();
            let dx = velocity[0];
            let dy = velocity[1];

            let oldPosition = sprite.getPosition();

            let game = sprite.getGame();
            let width = game.getWidth();
            let height = game.getHeight();
            let overflow = game.getOverflow();

            let x_pos = (width + oldPosition[0] + overflow + dx) % width;
            let y_pos = (height + oldPosition[1] + overflow + dy) % height;

            // The x,y coordinates for the game start a little outside the canvas
            sprite.setPosition(x_pos - overflow, y_pos - overflow);
        }

        function updateAngle(sprite) {
            let newAngle = sprite.getAngle() + sprite.getAngularVelocity();
            sprite.setAngle(newAngle);
        }

        function updateVelocity(sprite) {
            let numAccelerationFunc = sprite.accelerationFunctions.length;
            for (var i = 0; i < numAccelerationFunc; ++i) {
                sprite.accelerationFunctions[i](sprite);
            }

            let velocity = sprite.getVelocity();
            let dx = velocity[0];
            let dy = velocity[1];
            let friction = sprite.getFriction();
            sprite.setVelocity(dx * friction, dy * friction);
        }

        // Private members
        let drawImage = function(canvas, image, opacity, frameCenter, frameSize,
                                  destinationCenter, destinationSize, rotation) {
            // Set the global opacity
            let context = canvas.getContext("2d");
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
        Sprite.prototype = {
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
                let size = this.imageInfo.frameSize;
                return this.scale * 1/5 * (size[0] + size[1]);
            },
            getGame: function() {
                return this.game;
            },
            getOwner: function() {
                return this.owner;
            },
            getTip: function() {
                let forward = this.getForwardVector();
                let imageSize = this.imageInfo.getFrameSize();
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
                let numUpdateFunc = this.updateFunctions.length;
                for (var i = 0; i < numUpdateFunc; ++i) {
                    this.updateFunctions[i](this);
                }
            },
            draw: function(canvas) {
                let frameSize = this.imageInfo.getFrameSize();
                let frameCenter = this.imageInfo.getOriginFrameCenter();
                let newFrameCenter = frameCenter;
                let framesNum = this.imageInfo.getFramesNum();

                if (this.imageInfo.isAnimated()) {
                    newFrameCenter = [frameCenter[0] + frameSize[0] * ((this.age - 1) % framesNum),
                                      frameCenter[1]];
                }

                let destinationCenter = this.position;
                let destinationSize = [frameSize[0] * this.scale,  frameSize[1] * this.scale];

                let rotation = this.angle;
                let overflow = this.game.getOverflow();
                let radius = this.getRadius() + overflow;

                let canvasWidth = this.game.getWidth();
                let canvasHeight = this.game.getHeight();

                let image = this.imageInfo.createImgElement();
                let opacity = this.opacity;

                drawImage(canvas, image, opacity, newFrameCenter, frameSize, destinationCenter,
                          destinationSize, rotation);

                if (destinationCenter[0] - radius < -overflow) {
                    let rightReflection = [destinationCenter[0] + canvasWidth,
                                           destinationCenter[1]];
                    drawImage(canvas, image, opacity, newFrameCenter, frameSize, rightReflection,
                              destinationSize, rotation);
                }

                if (destinationCenter[0] + radius > canvasWidth + overflow) {
                    let leftReflection = [destinationCenter[0] - canvasWidth,
                                          destinationCenter[1]];
                    drawImage(canvas, image, opacity, newFrameCenter, frameSize, leftReflection,
                              destinationSize, rotation);
                }

                if (destinationCenter[1] - radius < -overflow) {
                    let bottomReflection = [destinationCenter[0],
                                            destinationCenter[1] + canvasHeight];
                    drawImage(canvas, image, opacity, newFrameCenter, frameSize, bottomReflection,
                              destinationSize, rotation);

                }
                if (destinationCenter[1] + radius > canvasHeight + overflow) {
                    let topReflection = [destinationCenter[0],
                                         destinationCenter[1] - canvasHeight];
                    drawImage(canvas, image, opacity, newFrameCenter, frameSize, topReflection,
                              destinationSize, rotation);
                }
            },
            handleCollision: function(otherSprite) {
                let numCollisionFuncs = this.collisionFunctions.length;
                for (var i = 0; i < numCollisionFuncs; ++i) {
                    this.collisionFunctions[i](this, otherSprite);
                }
            }
        };
        return Sprite;
    })();


    // Ripple Class
    let Ripple = (function() {
        // Class definition with private attributes / methods
        let Ripple = function(owner, opacity) {
            let position = owner.getPosition();
            let velocity = owner.getVelocity();
            let velocityMagnitude = vectorMagnitude(velocity);
            let velocityVector = [velocity[0] / velocityMagnitude,
                                  velocity[1] / velocityMagnitude];
            let radius = owner.getRadius();
            let x = position[0] - velocityVector[0] * radius;
            let y = position[1] - velocityVector[1] * radius;
            let imageInfo = owner.getRippleImageInfo();
            let dx = 0;
            let dy = 0;
            let scale = radius * owner.getScale() * velocityMagnitude / 2000;
            opacity = velocityMagnitude / 6 > opacity ? 3 / velocityMagnitude : opacity;
            let ownerAngle = owner.getAngle();
            let forward = owner.getForwardVector();
            let angle = ownerAngle - angleBetweenVectors(forward, velocity);
            let angularVelocity = 0;
            let sound = null;
            let playSound = false;
            let friction = 1;
            let is_static = true;
            let lifespan = 60;
            Sprite.call(this, owner.getGame(), x, y, dx, dy, angle, angularVelocity, imageInfo,
                        sound, playSound, friction, scale, owner, is_static, opacity, lifespan);

            this.updateFunctions.push(expand);
            this.updateFunctions.push(fadeOut);
            this.game.addRipple(this);
            this.initialOpacity = this.opacity;
        };

        // Private Methods
        let expand = function(ripple) {
            let newScale = ripple.getScale() + 0.01;
            ripple.setScale(newScale);
        };
        let fadeOut = function(ripple) {
            let oldOpacity = ripple.getOpacity();
            let newOpacity = oldOpacity * 0.8;
            ripple.setOpacity(newOpacity);
        };

        Ripple.prototype = new Sprite;
        Ripple.prototype.getInitialOpacity = function() {
            return this.initialOpacity;
        };
        return Ripple;
    })();


    // Player Class
    let Player = (function() {
        // Class definition with private attributes / methods
        let Player = function(game, x, y, dx, dy, angle, imageInfo, thrustImageInfo, rippleImageInfo, speed, friction, scale, sound, thrustsound, thrustOnMap, turnLeftMap, turnRightMap) {
            Sprite.call(this, game, x, y, dx, dy, angle, 0, imageInfo, sound, false, friction, scale);
            this.noThrustImageInfo = imageInfo;
            this.thrustImageInfo = thrustImageInfo;
            this.rippleImageInfo = rippleImageInfo;
            this.score = 0;
            this.lives = 3;
            this.baseScale = this.scale;
            this.speed = speed;

            let player = this;
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

        Player.prototype = new Sprite;

        // Private Methods
        function updateScale(player) {
            let numUpdateScaleFuncs = player.updateScaleFunctions.length;
            for (var i = 0; i < numUpdateScaleFuncs; ++i) {
                player.updateScaleFunctions[i](player);
            }
        }

        function addRipple(player) {
            let velocity = player.getVelocity();
            let velocityMagnitude = vectorMagnitude(velocity);
            if (velocityMagnitude > 0.1) {
                new Ripple(player, 0.5);
            }
        }

        function thrustAcceleration(player) {
            let velocity = player.getVelocity();
            let dx = velocity[0];
            let dy = velocity[1];
            let forward = player.getForwardVector();

            if (player.isThrust && player.isThrust()) {
                dx += forward[0] * player.speed;
                dy += forward[1] * player.speed;
            }

            player.setVelocity(dx, dy);
        }

        // Public methods
        Player.prototype.init = function() {
            this.game.addPlayer(this);
        };
        Player.prototype.turnRight = function(player) {
            player.angularVelocity = 0.1;
        };
        Player.prototype.turnLeft = function(player) {
            player.angularVelocity = -0.1;
        };
        Player.prototype.stopTurn = function(player) {
            player.angularVelocity = 0;
        };
        Player.prototype.thrustOn = function(player) {
            player.thrust = true;
            player.imageInfo = player.thrustImageInfo;
            // player.sound.play(player);
        };
        Player.prototype.thrustOff = function(player) {
            player.thrust = false;
            player.imageInfo = player.noThrustImageInfo;
            // player.sound.play(player);
        };
        Player.prototype.isThrust = function() {
            return this.thrust;
        };
        Player.prototype.getSpeed = function() {
            return this.speed;
        };
        Player.prototype.getRippleImageInfo = function() {
            return this.rippleImageInfo;
        };
        Player.prototype.getRippleOpacity = function() {
            return this.ripplePacity;
        };
        Player.prototype.createKeyDownListener = function() {
            let player = this;
            return function(e) {
                let key = e.key;
                if (key in player.keyDownMapping) {
                    player.keyDownMapping[key](player);
                }
            };
        };
        Player.prototype.createKeyUpListener = function() {
            let player = this;
            return function(e) {
                let key = e.key;
                if (key in player.keyUpMapping) {
                    player.keyUpMapping[key](player);
                }
            };
        };
        return Player;
    })();

    // Surfer Class
    let Surfer = (function() {
        // Class definition with private attributes / methods
        let Surfer = function(game, position, scale) {
            let url = "./assets/images/PlayerSurfer.svg";

            let surferInfo = new ImageInfo(url, [0,0], [90, 90], true, - 90/360 * 2*Math.PI);
            let surferThrustInfo = new ImageInfo(url, [0,0], [90, 90], true, -90/360 * 2*Math.PI);

            let rippleUrl = "./assets/images/Ripple Half.svg";
            let rippleImageInfo = new ImageInfo(rippleUrl, [0,0], [500, 300], false, -90/360 * 2*Math.PI);

            let sound = "Not Implemented";
            let thrustsound = "Not Implemented";

            let x = position[0];
            let y = position[1];
            let dx = 0;
            let dy = 0;
            let angle = 0;

            let friction = 0.9;

            let speed = 1.5;

            Player.call(this, game, x, y, dx, dy, angle, surferInfo, surferThrustInfo, rippleImageInfo, speed, friction, scale, sound, thrustsound, 'ArrowUp', 'ArrowLeft', 'ArrowRight');

            let surfer = this;
            this.keyDownMapping["U+0020"] = surfer.jump; // TODO: implement
            this.collisionFunctions.push(collisionBump);

            this.init();
        };

        Surfer.prototype = new Player;

        // Private methods
        function collisionBump(player, otherSprite) {
            let ratio = otherSprite.getRadius() / player.getRadius();
            let collisionDirection = otherSprite.getForwardVector();

            let oldVelocity = player.getVelocity();

            if (otherSprite.isStatic()) {
                player.setVelocity(-oldVelocity[0], -oldVelocity[1]);
            }
            else {
                player.setVelocity((oldVelocity[0] + ratio * player.speed * collisionDirection[0]),
                                   (oldVelocity[1] + ratio * player.speed * collisionDirection[1]));
            }
        }

        // Public methods
        Surfer.prototype.jump = function(surfer) {
            console.log(surfer);
            return;
        };
        return Surfer;
    })();

    // Monster Class
    let Monster = (function() {
        // Class definition with private attributes / methods
        let Monster = function(game, position, scale) {
            let url = "./assets/images/PlayerMonster.svg";

            let monsterInfo = new ImageInfo(url, [0,0], [270, 270], true, 90/360 * 2*Math.PI);
            let monsterThrustInfo = new ImageInfo(url, [0,0], [270, 270], true, 90/360 * 2*Math.PI);

            let rippleUrl = "./assets/images/Ripple full.svg";
            let rippleImageInfo = new ImageInfo(rippleUrl, [0,0], [500, 600], false, 0);

            let sound = "Not Implemented";
            let thrustsound =  "Not Implemented";

            let x = position[0];
            let y = position[1];
            let dx = 0;
            let dy = 0;
            let angle = 0;

            let friction = 0.992;

            let speed = 0.2;

            Player.call(this, game, x, y, dx, dy, angle, monsterInfo, monsterThrustInfo, rippleImageInfo, speed, friction, scale, sound, thrustsound, 'w', 'a', 'd');

            let monster = this;
            this.keyDownMapping["Shift"] = monster.eat; // TODO: implement

            this.updateScaleFunctions.push(velocityScale);
            this.accelerationFunctions.push(dontStopAcceleration);
            this.collisionFunctions.push(shoreCollision);

            this.init();
        };

        Monster.prototype = new Player;

        // Private methods
        function velocityScale(monster) {
            let vectorSize = vectorMagnitude(monster.getVelocity());
            monster.setScale(monster.baseScale + vectorSize / 100);
        }

        function shoreCollision(monster, otherSprite) {
            if (otherSprite.isStatic()) {
                let oldVelocity = monster.getVelocity();
                let dx = -oldVelocity[0];
                let dy = -oldVelocity[1];
                monster.setVelocity(dx, dy);
    //            let distanceFromShore = dist(monster, otherSprite);
    //            let approachRadius = this.monster.getRadius() * 2;
    //            if (distanceFromShore < approachRadius) {
    //                let ratio = approachRadius / distanceFromShore;
    //                let speed = monster.getSpeed;
    //                let forward = monster.getForwardVector();
    //                let dfx = forward[0];
    //                let dfy = forward[1];
    //
    //                let dx = oldVelocity[0] - dfx * ratio * speed;
    //                let dy = oldVelocity[1] - dfy * ratio * speed;
    //
    //            }

            }
        }

        function dontStopAcceleration(monster) {
            let velocity = monster.getVelocity();
            let dx = velocity[0];
            let dy = velocity[1];
            let forward = monster.getForwardVector();
            let dfx = forward[0];
            let dfy = forward[1];

            let speed = monster.getSpeed();

            let ratio = (vectorMagnitude(forward) + 1) / (vectorMagnitude(velocity) + 1);

            dx += dfx * speed * ratio;
            dy += dfy * speed * ratio;

            monster.setVelocity(dx, dy);
        }

        // Public methods
        Monster.prototype.eat = function(monster) {
            console.log(monster);
            return;
        };
        return Monster;
    })();

    // Game Logic
    let Game = (function(document) {
        // Class definition with private attributes / methods
        let Game = function(gameCanvas, playerScale, FPS) {
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

            let game = this;

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
        Game.prototype = {
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
                let distance = dist(sprite1.getPosition(), sprite2.getPosition());
                return distance < (sprite1.getRadius() + sprite2.getRadius());
            },
            spriteCollisionsWithArray: function(array, sprite) {
                let arrayLen = array.length;
                for (var i = 0; i < arrayLen ; ++i) {
                    let otherSprite = array[i];
                    if (sprite != otherSprite && this.checkSpriteCoupleCollision(sprite, otherSprite)) {
                        sprite.handleCollision(otherSprite);
                    }
                }
            },
            randomMapPoint: function(radius) {
                // Return a random point not colliding with another player or object
                let randomPoint = [Math.random() * this.getWidth(),
                                   Math.random() * this.getHeight()];
                let draw = true;

                let playersNum = this.players.length;
                for (var i = 0; i < playersNum; ++i) {
                    let player = this.players[i];
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
                let game = this;

                let playersNum = this.players.length;
                for (var i = 0; i < playersNum; ++i) {
                    let player = game.players[i];
                    document.addEventListener("keydown", player.createKeyDownListener());
                }
            },
            assignKeyUpEventListeners: function() {
                let game = this;

                let playersNum = this.players.length;
                for (var i = 0; i < playersNum; ++i) {
                    let player = game.players[i];
                    document.addEventListener("keyup", player.createKeyUpListener());
                }
            },
            init: function(difficulty) {
                let game = this;
                new Surfer(game, this.randomMapPoint(), this.playerScale * 1.4);
                new Monster(game, this.randomMapPoint(), this.playerScale / 1.2);

                game.started = true;
                game.startTime = game.time;
                game.difficulty = difficulty;
                game.result = "";

                game.assignKeyDownEventListeners();
                game.assignKeyUpEventListeners();
                console.log("init complete");
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

                let player;
                let i;
                let playersNum = this.players.length;

                if (!this.started) {
                    let splashImageURL = "http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/splash.png";
                    let splashInfo = new ImageInfo(splashImageURL, [0, 0], [400, 300]);

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
                    let ripplesNum = this.ripples.length;
                    for (i = 0; i < ripplesNum; ++i) {
                        let ripple = this.ripples[i];
                        ripple.draw(this.gameCanvas);
                    }
                }
            },
            updateAll: function() {
                // animiate background
                this.time += 1;
                let player;
                let i;
                let playersNum = this.players.length;

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

                    let oldRipples = this.ripples;
                    let rippleNum = oldRipples.length;
                    this.ripples = [];

                    for (i = 0; i < rippleNum; ++i) {
                        let ripple = oldRipples[i];
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
        return Game;
    })(document);

    // View logic - receives the HTML object and grid dimensions and draws the game board.
    let View = (function() {
        // Class definition with private attributes / methods
        let View = function(gameCanvas, fontSize) {
            // Will hold a <table> element that will display the game's canvas
            this.gameCanvas = gameCanvas;
            this.fontSize = fontSize; // = 25
        };

        // Scope constants

        // Public methods
        View.prototype = {
            initGame: function() {
                this.game = new Game(this.gameCanvas, 0.3, 1, 60);
                this.game.init(1);
                // TODO: should show splash screen
            }
        };
        return View;
    })();

    let c = document.getElementById("gameCanvas");
    c.width = document.documentElement.clientWidth - 10;
    c.height = document.documentElement.clientHeight - 10;
    this.view = new View(c, 25);
    this.view.initGame();
});
