# Prototype - http://www.codeskulptor.org/#user40_xR8oSP91ja_4.py
import Tkinter
import math
import random

# globals for user interface
WIDTH = 800
HEIGHT = 600
time = 0.5
start_time = 0
started = False
# missile_speed = 8
font_size = 25
playerscale = 0.7
result = ""

# initialize player list and two sprite sets
players = []
# rocks = set([])
# missiles = set([])
# explosions = set([])

# Set the game difficulty
# Affects:  the speed of the player       (higher = faster), 
#           the speed of the astroids   (higher = faster),
#           the speed of the missiles   (higher = slower),
#           the size of the asteroid    (higher = bigger).
difficulty = 1


class ImageInfo:
    def __init__(self, center, size, radius = 0, lifespan = float('inf'), animated = False):
        self.center = center
        self.size = size
        self.radius = radius
        self.lifespan = lifespan
        self.animated = animated

    def get_center(self):
        return self.center

    def get_size(self):
        return self.size

    def get_radius(self):
        return self.radius

    def get_lifespan(self):
        return self.lifespan

    def get_animated(self):
        return self.animated

    
# art assets created by Kim Lathrop, may be freely re-used in non-commercial projects, please credit Kim
    
# debris images - debris1_brown.png, debris2_brown.png, debris3_brown.png, debris4_brown.png
#                 debris1_blue.png, debris2_blue.png, debris3_blue.png, debris4_blue.png, debris_blend.png
# debris_info = ImageInfo([320, 240], [640, 480])
# debris_image = simplegui.load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/debris2_blue.png")

# sea image
water_info = ImageInfo([400, 300], [800, 600])
water_image = simplegui.load_image("https://www.colourbox.com/preview/1297630-water-texture-with-solar-patches-of-light.jpg")

# splash image
splash_info = ImageInfo([200, 150], [400, 300])
splash_image = simplegui.load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/splash.png")

# missile image - shot1.png, shot2.png, shot3.png
# missile_info = ImageInfo([5,5], [10, 10], 3, 40)
# missile_image = simplegui.load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/shot2.png")

# asteroid images - asteroid_blue.png, asteroid_brown.png, asteroid_blend.png
# asteroid_info = ImageInfo([45, 45], [90, 90], 40)
# asteroid_image = simplegui.load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/asteroid_blue.png")

# animated explosion - explosion_orange.png, explosion_blue.png, explosion_blue2.png, explosion_alpha.png
# explosion_info = ImageInfo([64, 64], [128, 128], 17, 24, True)
# explosion_image = simplegui.load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/explosion_alpha.png")

# sound assets purchased from sounddogs.com, please do not redistribute
# soundtrack = simplegui.load_sound("http://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/soundtrack.mp3")
# missile_sound = simplegui.load_sound("http://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/missile.mp3")
# missile_sound.set_volume(.5)
surfer_thrust_sound = simplegui.load_sound("http://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/thrust.mp3")
# explosion_sound = simplegui.load_sound("http://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/explosion.mp3")

# helper functions to handle transformations
def angle_to_vector(ang):
    return [math.cos(ang), math.sin(ang)]

def dist(p,q):
    return math.sqrt((p[0] - q[0]) ** 2+(p[1] - q[1]) ** 2)

def random_map_point(radius):
    '''
    @summary:
        Return a random point not colliding with another player or object
    '''
    random_point = (random.random() * WIDTH, random.random() * HEIGHT)
    draw = True
    for player in players:
        if dist(player.pos,random_point) < 2 * (player.get_radius() + radius):
            draw = False
    # for rock in rocks:
    #     if dist(rock.pos,random_point) < 2 * (rock.get_radius() + radius):
    #         draw = False
    # for missile in missiles:
    #     if dist(missile.pos,random_point) < 2 * (missile.get_radius() + radius):
    #         draw = False 
    if draw:
        return random_point
    else:
        return random_map_point(radius)

def random_direction():
    return [random.random() * 2 - 1, random.random() * 2 - 1]


# collision handlers
def group_collide(group, other_object):
    removal_set = set([])
    for member in group:
        if member != other_object:
            if member.collide(other_object):
                removal_set.add(member)
                owner = other_object.get_owner()
                if owner in players:
                    owner.score += 1
    if type(group) == type(removal_set):
        group.difference_update(removal_set)    
    return len(removal_set)

def group_group_collide(group, other_group):
    removal_set_group = set([])
    for member in group:
        if group_collide(other_group, member) > 0:
            removal_set_group.add(member)
    group.difference_update(removal_set_group)
    

# Sprite class
class Sprite:
    def __init__(self, pos, vel, ang, ang_vel, image, info, sound = None, playsound = True, friction = 1.00, scale = 1, owner = None):
        self.pos = [pos[0],pos[1]]
        self.vel = [vel[0],vel[1]]
        self.info = info
        self.angle = ang
        self.angle_vel = ang_vel
        self.image = image
        self.image_center = info.get_center()
        self.image_size = info.get_size()
        self.radius = info.get_radius() * scale
        self.scale = scale
        self.lifespan = info.get_lifespan()
        self.animated = info.get_animated()
        self.age = 0
        if sound:
            self.sound = sound
            self.sound.set_volume(0.1)
            sound.rewind()
            if playsound:
                sound.play()
                
        self.owner = owner
        self.thrust = False
        self.friction = friction
        self.forward = angle_to_vector(self.angle)
        self.tip = [self.pos[0] + (self.image_size[0] / 2 * self.forward[0] * self.scale),self.pos[1] + (self.image_size[0] / 2 * self.forward[1] * self.scale)]
        
    def set_position(self, pos):
        self.pos = pos

    def draw(self, canvas):
        if self.animated:
            animation_steps = self.image_size[0] * (self.age - 1)
            center_source = (self.image_center[0] + animation_steps, self.image_center[1]) 
            center_dest = (self.pos[0] - self.radius, self.pos[1] - self.radius)

        else:
            center_source = self.image_center
            center_dest = self.pos

        width_height_source = self.image_size
        width_height_dest = (self.image_size[0] * self.scale,  self.image_size[1] * self.scale)
        rotation = self.angle

        canvas.draw_image(self.image, center_source, width_height_source, center_dest,
                          width_height_dest, rotation)

    def change_scale(self, newscale):
        self.scale = newscale
        self.radius = self.info.get_radius() * self.scale
    
    def update(self):
        self.pos[0] = (self.pos[0] + self.vel[0])%(WIDTH + 2 * self.radius)
        self.pos[1] = (self.pos[1] + self.vel[1])%(HEIGHT + 2 * self.radius)
        
        self.angle += self.angle_vel
        
        self.forward = angle_to_vector(self.angle)
        
        if self.thrust:
            self.vel[0] += self.forward[0] * math.log(10 + difficulty,10) / 5
            self.vel[1] += self.forward[1] * math.log(10 + difficulty,10) / 5
        
        self.vel[0] *= self.friction
        self.vel[1] *= self.friction
        
        self.tip = [self.pos[0] + (self.image_size[0] / 2 * self.forward[0] * self.scale),self.pos[1] + (self.image_size[0] / 2 * self.forward[1] * self.scale)]
        
        self.age += 1
        
        if self.age >= self.lifespan:
            return False
        else:
            return True    
        
    def get_position(self):
        return self.pos
    
    def get_radius(self):
        return self.radius
        
    def collide(self, other_object):
        check_collide = dist(self.get_position(),other_object.get_position()) < (self.get_radius() + other_object.get_radius())
        # if check_collide:
            # new_explosion = Sprite(other_object.pos, (0,0), 0, 0, explosion_image, explosion_info, explosion_sound, True, scale=other_object.scale * math.sqrt(self.vel[0]**2 + self.vel[1]**2) / 2)
            # explosions.add(new_explosion)
        return check_collide

    def get_owner(self):
        return self.owner
    
# Player class
class Player(Sprite):
    def __init__(self, pos, vel, friction, angle, image, info, thrust_info, 
                leftmap = "left", rightmap = "right", thrustmap = "up", 
                thrustsound = surfer_thrust_sound):
        Sprite.__init__(self, pos, vel, angle, ang_vel=0, 
                        image=image, info=info, sound=thrustsound, playsound=False, 
                        friction=friction, scale=playerscale)
        self.no_thrust_info = info
        self.thrust_info = thrust_info
        self.score = 0
        self.lives = 3        
        self.keydownmapping = {simplegui.KEY_MAP[leftmap]: self.turn_left, 
                               simplegui.KEY_MAP[rightmap]: self.turn_right,
                               simplegui.KEY_MAP[thrustmap]: self.thrust_on} 
    
        self.keyupmapping = {simplegui.KEY_MAP[leftmap]: self.stop_turn, 
                             simplegui.KEY_MAP[rightmap]: self.stop_turn,
                             simplegui.KEY_MAP[thrustmap]: self.thrust_off} 
        
    def turn_right(self):
        self.angle_vel = 0.1

    def turn_left(self):
        self.angle_vel = -0.1
        
    def stop_turn(self):
        self.angle_vel = 0
        
    def thrust_on(self):
        self.thrust = True
        self.info = self.thrust_info
        self.image_center = self.info.get_center()
        self.image_size = self.info.get_size()
        self.sound.play()
    
    def thrust_off(self):
        self.thrust = False
        self.info = self.no_thrust_info
        self.image_center = self.info.get_center()
        self.image_size = self.info.get_size()
        self.sound.rewind()

class Surfer(Player):
    def __init__(self, jump_map="space"):
        surfer_info = ImageInfo([45, 45], [90, 90], 35)
        surfer_thrust_info = ImageInfo([135, 45], [90, 90], 35)
        surfer_image = simplegui.load_image("https://fbcdn-sphotos-h-a.akamaihd.net/hphotos-ak-xpt1/v/t34.0-12/11774706_10153509316471660_768017570_n.jpg?oh=c3af29d78146812b95f2ba9ae7134823&oe=55B44727&__gda__=1437904140_342f1db1175515d46409a6e04683b6a2")

        super(Surfer, self).__init__(pos=[0, 0], #random_map_point(surfer_info.get_radius() * playerscale), 
                        vel=[0, 0], 
                        friction=0.98, 
                        angle=0, 
                        image=surfer_image,
                        info=surfer_info,
                        thrust_info=surfer_thrust_info)
        self.keydownmapping[simplegui.KEY_MAP[jump_map]] = self.jump

    def jump(self):
            pass
            # new_missile = Sprite(self.tip, [self.vel[0] + self.forward[0]*missile_speed / math.log(1 + difficulty), self.vel[1] + self.forward[1]*missile_speed / math.log(1 + difficulty)], 0, 0, missile_image, missile_info, missile_sound, True, False, 1, self)
            # missiles.add(new_missile)

class Wave(Player):
    def __init__(self):
        wave_info = ImageInfo([45, 45], [90, 90], 35)
        wave_thrust_info = ImageInfo([45, 45], [90, 90], 35)
        wave_image = simplegui.load_image("https://raw.githubusercontent.com/VehpuS/wave-game-jam/master/small_wave.png")

        random_point = random_map_point(wave_info.get_radius() * playerscale)

        super(Wave, self).__init__(pos=random_point, 
                        vel=[0, 0],
                        friction=0.98,
                        angle=0,
                        image=wave_image,
                        info=wave_info,
                        thrust_info=wave_thrust_info,
                        leftmap="a",
                        rightmap="d",
                        thrustmap="w")

def draw(canvas):
    global time, players, started, result # rocks, missiles, 
    
    # animiate background
    time += 1
    center = water_info.get_center()
    size = water_info.get_size()
    # center = debris_info.get_center()
    # size = debris_info.get_size()
    wtime = (time / 8) % center[0]
    canvas.draw_image(water_image, water_info.get_center(), water_info.get_size(), [WIDTH / 2, HEIGHT / 2], [WIDTH, HEIGHT])
    # canvas.draw_image(debris_image, [center[0] - wtime, center[1]], [size[0] - 2 * wtime, size[1]], 
                                # [WIDTH / 2 + 1.25 * wtime, HEIGHT / 2], [WIDTH - 2.5 * wtime, HEIGHT])
    # canvas.draw_image(debris_image, [size[0] - wtime, center[1]], [2 * wtime, size[1]], 
                                # [1.25 * wtime, HEIGHT / 2], [2.5 * wtime, HEIGHT])

    # draw splash screen if not started
    if not started:
        canvas.draw_image(splash_image, splash_info.get_center(), 
                          splash_info.get_size(), [WIDTH / 2, HEIGHT / 2], 
                          splash_info.get_size())
        canvas.draw_text(result, (5, HEIGHT * 0.05), font_size - 2, "White", "monospace")
    else:
        # draw and update the location of the player and sprites
        for player in players:
            #if player.update():
            player.update()
            player.draw(canvas)
            # player.lives -= group_collide(rocks, player)
            
        # dead_rocks = set([])
        # for rock in rocks:
        #     if rock.update():
        #         rock.draw(canvas)
        #     else:
        #         dead_rocks.add(rock)
        # rocks.difference_update(dead_rocks)
        
        # remove dead missiles
        # dead_missiles = set([])    
        # for missile in missiles:
        #     if missile.update():
        #         missile.draw(canvas)
        #     else:
        #         dead_missiles.add(missile)
        # missiles.difference_update(dead_missiles)
        
        # deal with colisions
        # group_group_collide(missiles, rocks)
        # group_group_collide(missiles, players)
        # group_group_collide(rocks, rocks)
        for player in players:
            for other_player in players:
                if other_player != player:
                    if player.collide(other_player):
                        player.vel[0] = -player.vel[0]
                        player.vel[1] = -player.vel[1]
                        player.score -= 1
        
        # remove dead explosions
        # dead_explosions = set([])    
        # for explosion in explosions:
        #     if explosion.update():
        #         explosion.draw(canvas)
            # else:
            #     dead_missiles.add(explosion)
        # explosions.difference_update(dead_missiles)
        
        
        # update lives and score
        for player in range(0,len(players)):
            lives_text = "Player " + str(player + 1) +" Lives: " + str(players[player].lives)
            lives_pos = (20, font_size * (player + 1))
            canvas.draw_text(lives_text, lives_pos, font_size, "White", "monospace")
            
            score_text = "Player " + str(player + 1) +" Score: " + str(players[player].score)
            score_text_pos = (WIDTH - 18 * len(score_text), font_size * (player + 1))
            canvas.draw_text(score_text, score_text_pos, font_size, "White", "monospace")
        
        score_text = "Score: " + str(players[player].score)
        
        # check to see if any player lost
        for player in players:
            if player.lives == 0:
                started = False
            if not started:
                for player in range(0,len(players)):
                    result += "Player " + str(player + 1) + " scored " + str(players[player].score) + " points! "
                # timer.stop()
                # timer2.stop()
                for player in players:
                    player.sound.pause()
                players = []
                # rocks = set([])
                # missiles = set([])
                # soundtrack.pause()
                # soundtrack.rewind()
            
# read keydown and keyup handlers from the players

def keydown(key):
    for player in players:
        if key in player.keydownmapping:
            player.keydownmapping[key]()
            
           
    
def keyup(key):
    for player in players:
        if key in player.keyupmapping:
            player.keyupmapping[key]()

# Handler for pressing the splash screen
def start_handler(pos):
    global started, difficulty, result
    if not started:
        # timer.start()
        # timer2.start()
        players.append(Wave())
        players.append(Surfer())

        started = True
        start_time = time
        # soundtrack.rewind()
        # soundtrack.play()        
        difficulty = 1
        result = ""
            
# Timer handler for varying difficulty.
def harder_dif():
    global difficulty
    if difficulty < 10:
        difficulty += 1
    for player in players:
        player.score += 50

# Player Size Handlers            
def smaller_size():
    global playerscale
    if playerscale > 0.5:
        playerscale -= 0.1
    for player in players:
        player.change_scale(playerscale)
    
def bigger_size():
    global playerscale
    if playerscale < 1.4:
        playerscale += 0.1
    for player in players:
        player.change_scale(playerscale)
            
            
# timer handler for spawning missing rocks.    
# def rock_spawn():
#     if started:
#         rock_limit = 7 * difficulty // 2
#         scale = (random.randrange(5,11) * 1.01 ** difficulty) / 10
#         new_rock = Sprite(random_map_point(asteroid_info.get_radius() * scale), [random_direction()[0] * difficulty, random_direction()[1] * difficulty], 0, random.random() * 0.1 - 0.05, asteroid_image, asteroid_info, None, True, scale=scale)
#         if len(rocks) < rock_limit // len(players):
#             rocks.add(new_rock)

    
# initialize frame
top = Tkinter.Tk()

frame = simplegui.create_frame("Asteroids", WIDTH, HEIGHT)

# instruction_label1 = frame.add_label("You may add another player (controlled by wasd keys) by pressing p. (Strong computer recommended - it gets slow with time)")
# instruction_label2 = frame.add_label("Set player size.")
# smaller = frame.add_button("smaller", smaller_size)
# bigger = frame.add_button("BIGGER", bigger_size)


# register handlers
frame.set_draw_handler(draw)
frame.set_keydown_handler(keydown)
frame.set_keyup_handler(keyup)
frame.set_mouseclick_handler(start_handler)

# timer = simplegui.create_timer(1000.0, rock_spawn)
# timer2 = simplegui.create_timer(15000.0, harder_dif)

# get things rolling
frame.start()

top.mainloop()