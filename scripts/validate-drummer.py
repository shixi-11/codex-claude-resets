import bpy, math, json
scene=bpy.context.scene
collisions=[];length_error=0;alignment_error=0
for f in range(1,49):
 scene.frame_set(f)
 for side in ['Left','Right']:
  assert side+' elbow' not in bpy.data.objects
  assert side+' forearm' not in bpy.data.objects
  a=bpy.data.objects[side+' shoulder'].matrix_world.translation
  h=bpy.data.objects[side+' gripping mitten'].matrix_world.translation
  tip=bpy.data.objects[side+' felt head'].matrix_world.translation
  arm=bpy.data.objects[side+' single arm']
  length_error=max(length_error,abs((h-a).length-arm.scale.z),abs((tip-h).length-.94))
  alignment_error=max(alignment_error,(h-a).normalized().cross((tip-h).normalized()).length)
  radial=math.hypot(tip.x-1.35,tip.y+.67)
  distance=math.hypot(max(radial-.675,0),max(.235-tip.z,tip.z-.97,0))
  if distance<.138:collisions.append([f,side,round(distance,4)])
print('MOTION_CHECK '+json.dumps({'length_error':length_error,'arm_mallet_alignment_error':alignment_error,'drum_collisions':collisions}))
assert length_error<.00001
assert alignment_error<.00001
assert not collisions
for side,frame in [('Left',1),('Right',9)]:
 scene.frame_set(frame)
 a=bpy.data.objects[side+' shoulder'].matrix_world.translation
 h=bpy.data.objects[side+' gripping mitten'].matrix_world.translation
 assert h.z-a.z>.6
