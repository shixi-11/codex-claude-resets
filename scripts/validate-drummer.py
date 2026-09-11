import bpy, math, json
scene=bpy.context.scene
collisions=[];length_error=0;max_bend=0
for f in range(1,49):
 scene.frame_set(f)
 for side in ['Left','Right']:
  a=bpy.data.objects[side+' shoulder'].matrix_world.translation
  e=bpy.data.objects[side+' elbow'].matrix_world.translation
  h=bpy.data.objects[side+' gripping mitten'].matrix_world.translation
  tip=bpy.data.objects[side+' felt head'].matrix_world.translation
  length_error=max(length_error,abs((e-a).length-.40),abs((h-e).length-.45))
  max_bend=max(max_bend,math.degrees((e-a).angle(h-e)))
  radial=math.hypot(tip.x-1.35,tip.y+.67)
  radial_gap=max(radial-.675,0)
  height_gap=max(.235-tip.z,tip.z-.97,0)
  distance=math.hypot(radial_gap,height_gap)
  if distance<.138:collisions.append([f,side,round(distance,4)])
print('MOTION_CHECK '+json.dumps({'length_error':length_error,'max_elbow_bend_degrees':max_bend,'drum_collisions':collisions}))
assert length_error < 0.00001, 'Arm segment lengths changed'
assert max_bend < 80, 'Elbow folds too sharply'
assert not collisions, 'Mallet intersects drum outside its contact surface'
