import bpy, math, os
from mathutils import Vector
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out=os.path.join(root,'design','reset-station')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.35,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emission
 return m
graphite=mat('Deep pine anodized metal',(.025,.075,.053),.45,.27)
rim=mat('Satin warm aluminium',(.5,.58,.44),.7,.27)
ceramic=mat('Ivory ceramic',(.77,.82,.66),.1,.24)
lime=mat('Reset signal',(.53,.9,.15),.15,.24,1)
black=mat('Inset screen',(.007,.023,.013),.15,.15)
def cube(name,loc,scale,m,bevel=.12):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);mod=o.modifiers.new('Machined corners','BEVEL');mod.width=bevel;mod.segments=6;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def cylinder(name,r,depth,z,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=r,depth=depth,location=(0,0,z));o=bpy.context.object;o.name=name;o.data.materials.append(m);b=o.modifiers.new('Rounded edge','BEVEL');b.width=.07;b.segments=4;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
cube('Weighted square base',(0,0,.16),(2.75,2.75,.32),graphite,.24)
cube('Metal seam',(0,0,.34),(2.55,2.55,.08),rim,.2)
cube('Upper housing',(0,0,.46),(2.5,2.5,.24),graphite,.2)
cylinder('Circular bezel',1.02,.15,.63,rim)
cylinder('Button travel gap',.92,.1,.72,black)
cylinder('Porcelain reset key',.84,.28,.88,ceramic)
# A continuous reset arc and arrowhead on the top surface.
curve=bpy.data.curves.new('Reset arrow arc','CURVE');curve.dimensions='3D';curve.bevel_depth=.065;curve.bevel_resolution=5
s=curve.splines.new('POLY');s.points.add(59)
for i,p in enumerate(s.points):
 a=math.radians(35+i*285/59);p.co=(.47*math.cos(a),.47*math.sin(a),1.037,1)
o=bpy.data.objects.new('Reset arc',curve);bpy.context.collection.objects.link(o);o.data.materials.append(graphite)
a=math.radians(320);end=Vector((.47*math.cos(a),.47*math.sin(a),1.04));tangent=Vector((-math.sin(a),math.cos(a),0));normal=Vector((math.cos(a),math.sin(a),0));verts=[end+tangent*.19,end-tangent*.09+normal*.17,end-tangent*.09-normal*.17];mesh=bpy.data.meshes.new('Arrowhead');mesh.from_pydata(verts,[],[(0,1,2)]);o=bpy.data.objects.new('Reset arrowhead',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(graphite);solid=o.modifiers.new('Thickness','SOLIDIFY');solid.thickness=.035
# Three front-facing indicator windows, tied to the page's waiting/watching states.
for i in range(3):cube('Signal '+str(i),(-.48+i*.48,-1.256,.47),(.23,.04,.045),lime if i==0 else black,.014)
for x in [-1.03,1.03]:
 for y in [-1.03,1.03]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.045,location=(x,y,.588));bpy.context.object.data.materials.append(rim)
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.2,.26,.19,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,loc,power,size in [('Key',(-3,-4,6),650,5),('Rim',(4,2,4),900,4),('Fill',(-4,3,2),350,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4,-5.7,5.6));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.43))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=4.3
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX';scene.render.filepath=os.path.join(out,'reset-station.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'reset-station.blend'));bpy.ops.render.render(write_still=True)
