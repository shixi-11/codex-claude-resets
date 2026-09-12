"""Blender source for the website's original keycap drummer.

Run with Blender --background --python scripts/render-drummer.py -- preview|frames
The fixed camera and 48 keyed poses render a transparent, replayable 1.6 s alternating roll.
"""
import bpy
import math
import os
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art' / 'drummer'
OUT = ROOT / 'output' / 'drummer'
ART.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
MODE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'preview'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.get_devices()
    for device in prefs.devices:
        device.use = device.type != 'CPU'
    scene.cycles.device = 'GPU'
except Exception:
    scene.cycles.device = 'CPU'
scene.render.resolution_x = scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '8'
scene.render.fps = 30
scene.frame_start, scene.frame_end = 1, 48
scene.world.color = (0.38, 0.38, 0.38)
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
bpy.context.preferences.filepaths.save_version = 0

def material(name, color, roughness=.35, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metallic
    return m

ivory = material('Warm ivory ceramic', (.89,.855,.75), .28)
eye_mat = material('Deep green eye insets', (.012,.033,.024), .24)
lime = material('Lime reset emblem', (.54,.73,.085), .32)
olive = material('Satin olive drum shell', (.19,.30,.075), .28)
rim_mat = material('Soft brushed brass rims', (.64,.70,.29), .25,.45)
skin_mat = material('Ivory woven drum skin', (.87,.89,.61), .72)
wood = material('Warm maple mallet handle', (.40,.25,.105), .48)
felt = material('Lime soft mallet head', (.62,.77,.20), .64)
rope_mat = material('Cream drum lacing', (.75,.75,.51), .55)
ground_mat = material('Neutral shadow catcher', (.72,.74,.65), .8)

def finish(obj, name, mat, smooth=True):
    obj.name = name
    obj.data.materials.append(mat)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj

def sphere(name, pos, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=pos)
    ob = finish(bpy.context.object, name, mat)
    ob.scale = scale
    return ob

def bevel_box(name, pos, scale, radius, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    ob = finish(bpy.context.object, name, mat, False)
    ob.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = ob.modifiers.new('Rounded manufactured edges', 'BEVEL')
    bevel.width, bevel.segments = radius, 6
    ob.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return ob

def cylinder(name, pos, radius, depth, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=radius, depth=depth, location=pos)
    ob = finish(bpy.context.object, name, mat)
    bevel = ob.modifiers.new('Soft rim edges', 'BEVEL')
    bevel.width, bevel.segments = .025, 3
    ob.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return ob

def rod(name, a, b, radius, mat):
    ob = cylinder(name, (0,0,0), radius, 1, mat)
    pose_rod(ob, a, b)
    return ob

def pose_rod(ob, a, b):
    a,b = Vector(a),Vector(b)
    ob.location = (a+b)/2
    ob.rotation_euler = (b-a).to_track_quat('Z','Y').to_euler()
    ob.scale.z = (b-a).length

def curve(name, points, radius, mat):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions, data.resolution_u = '3D', 12
    data.bevel_depth, data.bevel_resolution = radius, 3
    spline = data.splines.new('POLY')
    spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):
        p.co = (*co,1)
    ob = bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(mat)
    return ob

char_x = -.58
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
body_root = bpy.context.object
body_root.name = 'Keycap body - gentle squash control'
# Trapezoidal keycap, not a cube with drawn outlines.
verts = [(char_x+x,y,z) for z,w,d in [(.58,.93,.75),(2.16,.76,.61)]
         for x,y in [(-w,-d),(w,-d),(w,d),(-w,d)]]
faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
mesh = bpy.data.meshes.new('Tapered keycap mesh')
mesh.from_pydata(verts,[],faces)
mesh.update()
body = bpy.data.objects.new('Rounded ivory keycap',mesh)
bpy.context.collection.objects.link(body)
finish(body,body.name,ivory,False)
bevel = body.modifiers.new('Generous keycap bevel', 'BEVEL')
bevel.width,bevel.segments = .14,7
body.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
body.parent = body_root
for i,x in enumerate([char_x-.27,char_x+.27]):
    eye = bevel_box(f'Eye {i+1}',(x,-.729,1.33),(.115,.065,.32),.043,eye_mat)
    eye.rotation_euler.x = -.088
    eye.parent = body_root
for i,x in enumerate([char_x-.44,char_x+.44]):
    sphere(f'Ankle {i+1}',(x,-.15,.48),(.19,.20,.19),ivory)
    bevel_box(f'Soft boot {i+1}',(x,-.34,.245),(.55,.85,.46),.20,ivory)

arc=[]
for i in range(46):
    theta=math.radians(35+285*i/45)
    arc.append((char_x+.34*math.cos(theta),.02+.32*math.sin(theta),2.171))
emblem=curve('Reset emblem ring',arc,.031,lime)
emblem.parent=body_root
end=Vector(arc[-1]);theta=math.radians(320)
tangent=Vector((-math.sin(theta),math.cos(theta),0))
back=end-tangent*.14
normal=Vector((math.cos(theta),math.sin(theta),0))
arrow=curve('Reset emblem arrow',[tuple(back+normal*.105),tuple(end),tuple(back-normal*.105)],.034,lime)
arrow.parent=body_root

# Turn the complete character toward the drum; keep the camera and drum fixed.
yaw = math.atan2(1.93, .67)
def facing_point(point):
    x,y,z=point
    x-=char_x
    return Vector((char_x+x*math.cos(yaw)-y*math.sin(yaw),
                   x*math.sin(yaw)+y*math.cos(yaw),z))
character_roots=[ob for ob in bpy.data.objects if ob.parent is None]
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(char_x,0,0))
facing=bpy.context.object
facing.name='Character facing drum'
bpy.context.view_layer.update()
for ob in character_roots:
    ob.parent=facing
    ob.matrix_parent_inverse=facing.matrix_world.inverted()
facing.rotation_euler.z=yaw

# Drum: membrane, shell, metal rims, lacing and three feet have distinct materials.
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(1.35,-.67,.15))
drum_root=bpy.context.object
drum_root.name='Drum rebound control'
drum_parts=[]
drum_parts.append(cylinder('Olive drum shell',(1.35,-.67,.55),.64,.65,olive))
drum_parts.append(cylinder('Top rim',(1.35,-.67,.90),.675,.09,rim_mat))
drum_parts.append(cylinder('Drum membrane',(1.35,-.67,.948),.615,.035,skin_mat))
drum_parts.append(cylinder('Bottom rim',(1.35,-.67,.235),.665,.08,rim_mat))
for i in range(12):
    a=2*math.pi*i/12;b=a+math.pi/12
    top=(1.35+.649*math.cos(a),-.67+.649*math.sin(a),.856)
    bot=(1.35+.649*math.cos(b),-.67+.649*math.sin(b),.286)
    drum_parts.append(rod('Tension lace '+str(i),top,bot,.015,rope_mat))
bpy.context.view_layer.update()
for ob in drum_parts:
    matrix=ob.matrix_world.copy();ob.parent=drum_root;ob.matrix_world=matrix
for i in range(3):
    a=2*math.pi*i/3
    sphere('Drum foot '+str(i),(1.35+.43*math.cos(a),-.67+.43*math.sin(a),.13),(.13,.13,.13),olive)

# Simple toy arms: one rigid arm per side, rotating only at the shoulder.
# Arm, mitten and mallet follow one continuous swing axis; no elbow joint.
rigs=[]
for side,local_x,hit_y in [('Left',-1.50,-1.02),('Right',.28,-.32)]:
    anchor=facing_point((local_x,-.50,1.18))
    shoulder=sphere(side+' shoulder',anchor,(.14,)*3,ivory)
    hand=sphere(side+' gripping mitten',anchor,(.145,)*3,ivory)
    arm=rod(side+' single arm',anchor,anchor+Vector((0,0,.75)),.105,ivory)
    stick=rod(side+' maple stick',anchor,anchor+Vector((0,0,.94)),.042,wood)
    head=sphere(side+' felt head',anchor,(.145,)*3,felt)
    rigs.append((anchor,shoulder,hand,arm,stick,head))
for frame in range(1,49):
    impacts=[]
    for index,rig in enumerate(rigs):
        anchor,shoulder,hand,arm,stick,head=rig
        centers=[8,32] if index==0 else [20,44]
        contact=Vector((1.30,-.95,1.110)) if index==0 else Vector((1.48,-.36,1.110))
        forward=Vector((contact.x-anchor.x,contact.y-anchor.y,0)).normalized()
        vertical=Vector((0,0,1))
        reach=(contact-anchor).length
        arm_length=reach-.94
        strike_angle=math.atan2(contact.z-anchor.z,(contact-anchor).dot(forward))
        lift_angle=math.radians(98)
        rebound_angle=strike_angle+math.radians(12)
        if index==0:
            keys=[(1,lift_angle),(3,lift_angle),(8,strike_angle),(10,rebound_angle),
                  (21,lift_angle),(27,lift_angle),(32,strike_angle),(34,rebound_angle),
                  (45,lift_angle),(48,lift_angle)]
        else:
            keys=[(1,strike_angle),(9,lift_angle),(15,lift_angle),(20,strike_angle),
                  (22,rebound_angle),(33,lift_angle),(39,lift_angle),(44,strike_angle),
                  (46,rebound_angle),(48,strike_angle)]
        for begin,end in zip(keys,keys[1:]):
            if begin[0]<=frame<=end[0]:
                u=(frame-begin[0])/(end[0]-begin[0])
                u=u*u if end[0] in centers else u*u*(3-2*u)
                angle=begin[1]+(end[1]-begin[1])*u
                break
        direction=forward*math.cos(angle)+vertical*math.sin(angle)
        h=anchor+direction*arm_length
        tip=anchor+direction*reach
        impacts.append(max(max(0,1-abs(frame-hit)/2) for hit in centers))
        shoulder.location=anchor;hand.location=h;head.location=tip
        pose_rod(arm,anchor,h)
        pose_rod(stick,h-direction*.10,tip)
        for ob in [shoulder,hand,head,arm,stick]:
            for prop in ['location','rotation_euler','scale']:
                ob.keyframe_insert(data_path=prop,frame=frame)
    body_root.location.z=-.045*max(impacts)
    body_root.keyframe_insert(data_path='location',frame=frame)
for ob in bpy.data.objects:
    if ob.animation_data and ob.animation_data.action:
        for fcurve in ob.animation_data.action.fcurves:
            for key in fcurve.keyframe_points:
                key.interpolation='LINEAR'
                key.handle_left_type=key.handle_right_type='AUTO_CLAMPED'

# Shadow catcher preserves genuine soft contact shadows with transparent surroundings.
bpy.ops.mesh.primitive_plane_add(size=3.8,location=(-.1,-.1,.006))
ground=finish(bpy.context.object,'Transparent contact-shadow floor',ground_mat)
ground.scale.y=.63
ground.is_shadow_catcher=False
nodes=ground_mat.node_tree.nodes;nodes.clear()
links=ground_mat.node_tree.links
output=nodes.new('ShaderNodeOutputMaterial')
mix=nodes.new('ShaderNodeMixShader')
transparent=nodes.new('ShaderNodeBsdfTransparent')
shade=nodes.new('ShaderNodeEmission');shade.inputs['Color'].default_value=(.01,.018,.006,1)
coords=nodes.new('ShaderNodeTexCoord')
center=nodes.new('ShaderNodeVectorMath');center.operation='SUBTRACT';center.inputs[1].default_value=(.5,.5,0)
scale=nodes.new('ShaderNodeVectorMath');scale.operation='MULTIPLY';scale.inputs[1].default_value=(2,2,0)
length=nodes.new('ShaderNodeVectorMath');length.operation='LENGTH'
fade=nodes.new('ShaderNodeMapRange');fade.clamp=True;fade.interpolation_type='SMOOTHERSTEP'
fade.inputs['From Min'].default_value=0;fade.inputs['From Max'].default_value=1
fade.inputs['To Min'].default_value=.22;fade.inputs['To Max'].default_value=0
links.new(coords.outputs['Generated'],center.inputs[0]);links.new(center.outputs[0],scale.inputs[0]);links.new(scale.outputs[0],length.inputs[0]);links.new(length.outputs['Value'],fade.inputs['Value'])
links.new(fade.outputs[0],mix.inputs[0]);links.new(transparent.outputs[0],mix.inputs[1]);links.new(shade.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],output.inputs['Surface'])
def area(name,loc,power,size,color):
    bpy.ops.object.light_add(type='AREA',location=loc)
    light=bpy.context.object
    light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.data.color=color
    light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
area('Large warm studio key',(-3,-4,6),480,4.0,(1,.96,.86))
area('Soft front fill',(4,-3,4),220,3.0,(.87,.94,1))
area('Gentle top rim',(1,3,5),380,3.0,(1,1,.92))
bpy.ops.object.camera_add(location=(4.7,-8.7,6.0))
camera=bpy.context.object
camera.name='Locked three-quarter product camera'
target=Vector((.10,-.04,1.22))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=4.65
scene.camera=camera
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'20260912_敲鼓.blend'))
if MODE=='frames':
    (ART/'frames').mkdir(exist_ok=True)
    scene.render.resolution_x=scene.render.resolution_y=384
    scene.render.filepath=str(ART/'frames'/'drum_')
    bpy.ops.render.render(animation=True)
else:
    for frame,label in [(1,'待机'),(8,'左槌'),(20,'右槌')]:
        scene.frame_set(frame)
        scene.render.filepath=str(OUT/f'20260912_3D敲鼓_{label}.png')
        bpy.ops.render.render(write_still=True)
print('DRUMMER_RENDER_DONE',MODE,flush=True)
