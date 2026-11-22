import os
import math
import bpy
import bmesh
from mathutils import Vector

OUT_DIR = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\rubiconius-biratnagar\public\models"
BAKE_DIR = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\rubiconius-biratnagar\.shots\bakes"
PH_DIR = r"C:\Users\Lenovo LOQ\.gemini\antigravity\scratch\rubiconius-biratnagar\.cache\polyhaven"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(BAKE_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0

# Configure Cycles OptiX GPU (RTX 5050)
scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.refresh_devices()
gpu_ok = False
for backend in ('OPTIX', 'CUDA'):
    try:
        prefs.compute_device_type = backend
        prefs.get_devices()
        devs = [d for d in prefs.devices if d.type == backend]
        if devs:
            for d in prefs.devices:
                d.use = (d.type == backend)
            scene.cycles.device = 'GPU'
            gpu_ok = True
            print(f"[Cycles] Active GPU: {backend} ({devs[0].name})")
            break
    except Exception:
        pass
if not gpu_ok:
    scene.cycles.device = 'CPU'

scene.cycles.samples = 96
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = 0.015
scene.cycles.use_denoising = True
try:
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    pass
scene.cycles.max_bounces = 8
scene.cycles.diffuse_bounces = 4
scene.cycles.glossy_bounces = 3
scene.cycles.transmission_bounces = 4
scene.cycles.sample_clamp_indirect = 6.0

# Calibrated AgX exposure (-0.45) so sunlight beams glow warmly with ZERO blown-out white floor clipping!
try:
    scene.view_settings.view_transform = 'AgX'
    try:
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        scene.view_settings.look = 'None'
    scene.view_settings.exposure = -0.45
except Exception:
    scene.view_settings.view_transform = 'Filmic'

def make_col(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c

col_shell = make_col("Set_01_Shell")
col_joinery = make_col("Set_02_Joinery")
col_monoliths = make_col("Set_03_Monoliths")
col_courtyard = make_col("Set_04_Courtyard")
col_live = make_col("Live_PBR_Accents")
col_props = make_col("Live_PolyHaven_Props")
col_lights = make_col("Lights")
col_cam = make_col("Camera_Rig")

def link_obj(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)

def add_box(name, center, size, col, bevel=0.006, segs=2, mat=None, rot_deg=(0, 0, 0)):
    """Flat-shaded architectural volume with crisp bevels -> ZERO dark normal seam artifacts!"""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link_obj(obj, col)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segs, affect='EDGES', clamp_overlap=True)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = Vector(center)
    obj.rotation_euler = tuple(math.radians(a) for a in rot_deg)
    # CRITICAL FIX: Keep planar architectural faces FLAT shaded so Cycles never bakes black bevel outlines!
    for p in mesh.polygons:
        p.use_smooth = False
    if mat:
        obj.data.materials.append(mat)
    return obj

def add_cyl(name, center, radius, depth, col, verts=36, mat=None, rot_deg=(0, 0, 0), bevel=0.004, smooth=True):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link_obj(obj, col)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts, radius1=radius, radius2=radius, depth=depth)
    if bevel > 0:
        cap_edges = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-4]
        bmesh.ops.bevel(bm, geom=cap_edges, offset=bevel, segments=2, affect='EDGES', clamp_overlap=True)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = Vector(center)
    obj.rotation_euler = tuple(math.radians(a) for a in rot_deg)
    for p in mesh.polygons:
        # Smooth only side walls, keep top/bottom caps flat so caps never bake dark rings
        p.use_smooth = smooth and (abs(p.normal.z) < 0.7)
    if mat:
        obj.data.materials.append(mat)
    return obj

def import_polyhaven_prop(asset_id, name_prefix, target_pos, target_height, rot_z_deg=0.0, col=col_props):
    """Import real CC0 Poly Haven photogrammetry glTF model, normalize to ground Z=target_pos[2], scale to target_height."""
    gltf_path = os.path.join(PH_DIR, asset_id, f"{asset_id}.gltf")
    if not os.path.exists(gltf_path):
        print(f"[PolyHaven] Missing {gltf_path}, skipping")
        return None

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=gltf_path)
    new_objs = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new_objs if o.type == 'MESH']
    empties = [o for o in new_objs if o.type != 'MESH']
    if not meshes:
        return None

    # Join imported parts into one clean mesh with preserved PBR materials/UVs
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    prop = bpy.context.active_object
    prop.name = name_prefix

    # Delete leftover empty parents safely
    for o in empties:
        try:
            bpy.data.objects.remove(o, do_unlink=True)
        except Exception:
            pass

    # Compute world bounding box and place exact bottom-center on target_pos
    bbox = [prop.matrix_world @ Vector(corner) for corner in prop.bound_box]
    min_v = Vector((min(v.x for v in bbox), min(v.y for v in bbox), min(v.z for v in bbox)))
    max_v = Vector((max(v.x for v in bbox), max(v.y for v in bbox), max(v.z for v in bbox)))
    cur_h = max(0.001, max_v.z - min_v.z)
    scale_f = target_height / cur_h
    center_xy = Vector(((min_v.x + max_v.x) * 0.5, (min_v.y + max_v.y) * 0.5, min_v.z))

    # Shift vertices so origin is bottom-center
    for v in prop.data.vertices:
        v.co = (v.co - center_xy) * scale_f
    prop.data.update()

    prop.location = Vector(target_pos)
    prop.rotation_euler = (0.0, 0.0, math.radians(rot_z_deg))
    link_obj(prop, col)
    print(f"[PolyHaven] Placed {name_prefix} ({asset_id}) h={target_height:.2f}m at {target_pos}")
    return prop

# ==============================================================================
# 1. REFINED ARCHITECTURAL PBR MATERIALS (Quiet Luxury, Zero Tie-Dye)
# ==============================================================================
def make_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n = m.node_tree.nodes
    l = m.node_tree.links
    bsdf = next(node for node in n if node.type == 'BSDF_PRINCIPLED')
    return m, n, l, bsdf

# A. Hand-Troweled Warm Lime Plaster (subtle organic mineral clouds)
mat_plaster, n, l, bsdf = make_mat("M_Lime_Plaster")
tc = n.new('ShaderNodeTexCoord')
n1 = n.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.6; n1.inputs['Detail'].default_value = 8.0; n1.inputs['Roughness'].default_value = 0.65
n2 = n.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 18.0; n2.inputs['Detail'].default_value = 5.0
ramp = n.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = 0.25; ramp.color_ramp.elements[0].color = (0.64, 0.61, 0.55, 1.0)
ramp.color_ramp.elements[1].position = 0.78; ramp.color_ramp.elements[1].color = (0.76, 0.73, 0.67, 1.0)
bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.05; bump.inputs['Distance'].default_value = 0.006
l.new(tc.outputs['Object'], n1.inputs['Vector'])
l.new(tc.outputs['Object'], n2.inputs['Vector'])
l.new(n1.outputs['Fac'], ramp.inputs['Fac'])
l.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
l.new(n2.outputs['Fac'], bump.inputs['Height'])
l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Roughness'].default_value = 0.84

# B. Honed Kota Stone Floor Slabs (calibrated darker midtone so sunlit beams NEVER clip white!)
mat_kota, n, l, bsdf = make_mat("M_Honed_Kota_Stone")
tc = n.new('ShaderNodeTexCoord')
brick = n.new('ShaderNodeTexBrick')
brick.offset = 0.0; brick.inputs['Scale'].default_value = 0.75
brick.inputs['Brick Width'].default_value = 1.2; brick.inputs['Row Height'].default_value = 1.2
brick.inputs['Mortar Size'].default_value = 0.003; brick.inputs['Mortar Smooth'].default_value = 0.3
brick.inputs['Color1'].default_value = (0.46, 0.43, 0.39, 1.0)
brick.inputs['Color2'].default_value = (0.42, 0.39, 0.35, 1.0)
brick.inputs['Mortar'].default_value = (0.28, 0.26, 0.23, 1.0)
noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 3.8; noise.inputs['Detail'].default_value = 8.0
mixc = n.new('ShaderNodeMix'); mixc.data_type = 'RGBA'; mixc.blend_type = 'MULTIPLY'; mixc.inputs['Factor'].default_value = 0.14
rramp = n.new('ShaderNodeValToRGB')
rramp.color_ramp.elements[0].position = 0.25; rramp.color_ramp.elements[0].color = (0.38, 0.38, 0.38, 1.0)
rramp.color_ramp.elements[1].position = 0.80; rramp.color_ramp.elements[1].color = (0.56, 0.56, 0.56, 1.0)
bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.06; bump.inputs['Distance'].default_value = 0.004
l.new(tc.outputs['Object'], brick.inputs['Vector'])
l.new(tc.outputs['Object'], noise.inputs['Vector'])
l.new(brick.outputs['Color'], mixc.inputs['A'])
l.new(noise.outputs['Color'], mixc.inputs['B'])
l.new(mixc.outputs['Result'], bsdf.inputs['Base Color'])
l.new(noise.outputs['Fac'], rramp.inputs['Fac'])
l.new(rramp.outputs['Color'], bsdf.inputs['Roughness'])
l.new(brick.outputs['Fac'], bump.inputs['Height'])
l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

# C. Fluted Dark Sal Timber (rich warm dark smoked walnut/Sal grain)
mat_sal, n, l, bsdf = make_mat("M_Fluted_Sal_Timber")
tc = n.new('ShaderNodeTexCoord')
mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (2.5, 2.5, 0.3)
wave = n.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = 'X'
wave.inputs['Scale'].default_value = 4.2; wave.inputs['Distortion'].default_value = 6.0; wave.inputs['Detail'].default_value = 6.0
ramp = n.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = 0.20; ramp.color_ramp.elements[0].color = (0.065, 0.036, 0.020, 1.0)
ramp.color_ramp.elements[1].position = 0.82; ramp.color_ramp.elements[1].color = (0.165, 0.095, 0.050, 1.0)
l.new(tc.outputs['Object'], mp.inputs['Vector'])
l.new(mp.outputs['Vector'], wave.inputs['Vector'])
l.new(wave.outputs['Fac'], ramp.inputs['Fac'])
l.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.45

# D. Bookmatched Honed Travertine Stone (subtle fine horizontal sedimentary grain, zero loud stripes!)
mat_trav, n, l, bsdf = make_mat("M_Honed_Travertine")
tc = n.new('ShaderNodeTexCoord')
mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.1, 1.1, 4.8)
noise_t = n.new('ShaderNodeTexNoise'); noise_t.inputs['Scale'].default_value = 2.6; noise_t.inputs['Detail'].default_value = 9.0; noise_t.inputs['Roughness'].default_value = 0.65
ramp = n.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position = 0.22; ramp.color_ramp.elements[0].color = (0.48, 0.43, 0.36, 1.0)
ramp.color_ramp.elements[1].position = 0.78; ramp.color_ramp.elements[1].color = (0.64, 0.59, 0.51, 1.0)
bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.07; bump.inputs['Distance'].default_value = 0.004
l.new(tc.outputs['Object'], mp.inputs['Vector'])
l.new(mp.outputs['Vector'], noise_t.inputs['Vector'])
l.new(noise_t.outputs['Fac'], ramp.inputs['Fac'])
l.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
l.new(noise_t.outputs['Fac'], bump.inputs['Height'])
l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Roughness'].default_value = 0.52

# E. Quiet Luxury Deep Verde Alpi / Malachite Marble (Deep forest emerald with delicate hairline mineral veins — NO tie-dye!)
mat_malachite, n, l, bsdf = make_mat("M_Verde_Alpi_Malachite")
tc = n.new('ShaderNodeTexCoord')
n_base = n.new('ShaderNodeTexNoise'); n_base.inputs['Scale'].default_value = 2.8; n_base.inputs['Detail'].default_value = 10.0; n_base.inputs['Roughness'].default_value = 0.68
n_warp = n.new('ShaderNodeTexNoise'); n_warp.inputs['Scale'].default_value = 4.5; n_warp.inputs['Detail'].default_value = 6.0
vor = n.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = 3.2
mix_v = n.new('ShaderNodeMix'); mix_v.data_type = 'VECTOR'; mix_v.inputs['Factor'].default_value = 0.22
r_base = n.new('ShaderNodeValToRGB')
r_base.color_ramp.elements[0].position = 0.20; r_base.color_ramp.elements[0].color = (0.012, 0.036, 0.027, 1.0)
r_base.color_ramp.elements[1].position = 0.80; r_base.color_ramp.elements[1].color = (0.032, 0.085, 0.064, 1.0)
r_vein = n.new('ShaderNodeValToRGB')
r_vein.color_ramp.elements[0].position = 0.0; r_vein.color_ramp.elements[0].color = (0.34, 0.42, 0.37, 1.0)
r_vein.color_ramp.elements[1].position = 0.045; r_vein.color_ramp.elements[1].color = (0.0, 0.0, 0.0, 1.0)
mix_final = n.new('ShaderNodeMix'); mix_final.data_type = 'RGBA'; mix_final.blend_type = 'SCREEN'; mix_final.inputs['Factor'].default_value = 0.42
l.new(tc.outputs['Object'], n_base.inputs['Vector'])
l.new(tc.outputs['Object'], n_warp.inputs['Vector'])
l.new(tc.outputs['Object'], mix_v.inputs['A'])
l.new(n_warp.outputs['Color'], mix_v.inputs['B'])
l.new(mix_v.outputs['Result'], vor.inputs['Vector'])
l.new(n_base.outputs['Fac'], r_base.inputs['Fac'])
l.new(vor.outputs['Distance'], r_vein.inputs['Fac'])
l.new(r_base.outputs['Color'], mix_final.inputs['A'])
l.new(r_vein.outputs['Color'], mix_final.inputs['B'])
l.new(mix_final.outputs['Result'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.24

# F. Warm Linen / Basalt / Ceramic / Wet Pool Bed / Cove LED
mat_linen, n, l, bsdf = make_mat("M_Oatmeal_Linen")
bsdf.inputs['Base Color'].default_value = (0.62, 0.58, 0.51, 1.0); bsdf.inputs['Roughness'].default_value = 0.90

mat_basalt, n, l, bsdf = make_mat("M_Dark_Basalt")
bsdf.inputs['Base Color'].default_value = (0.055, 0.055, 0.052, 1.0); bsdf.inputs['Roughness'].default_value = 0.52

mat_poolbed, n, l, bsdf = make_mat("M_Wet_Basalt_PoolBed")
bsdf.inputs['Base Color'].default_value = (0.028, 0.036, 0.034, 1.0); bsdf.inputs['Roughness'].default_value = 0.25

mat_ceramic, n, l, bsdf = make_mat("M_Matte_Ceramic")
bsdf.inputs['Base Color'].default_value = (0.70, 0.66, 0.60, 1.0); bsdf.inputs['Roughness'].default_value = 0.72

mat_cove, n, l, bsdf = make_mat("M_Warm_Cove_LED")
bsdf.inputs['Base Color'].default_value = (1.0, 0.91, 0.76, 1.0)
if 'Emission Color' in bsdf.inputs:
    bsdf.inputs['Emission Color'].default_value = (1.0, 0.87, 0.68, 1.0)
    bsdf.inputs['Emission Strength'].default_value = 4.5

# G. LIVE PBR ACCENTS (Dynamic Three.js PMREM environment reflections)
mat_brass, n, l, bsdf = make_mat("Live_Brushed_Brass")
bsdf.inputs['Base Color'].default_value = (0.76, 0.58, 0.29, 1.0)
bsdf.inputs['Metallic'].default_value = 0.94
bsdf.inputs['Roughness'].default_value = 0.25

mat_bronze, n, l, bsdf = make_mat("Live_Blackened_Bronze")
bsdf.inputs['Base Color'].default_value = (0.05, 0.048, 0.045, 1.0)
bsdf.inputs['Metallic'].default_value = 0.85
bsdf.inputs['Roughness'].default_value = 0.35

mat_water, n, l, bsdf = make_mat("Live_Courtyard_Water")
bsdf.inputs['Base Color'].default_value = (0.04, 0.075, 0.068, 1.0)
bsdf.inputs['Roughness'].default_value = 0.04

# ==============================================================================
# 2. ARCHITECTURAL SHELL (Zero Clipping, Clean Proportions, Grounded Everything)
# ==============================================================================
add_box("Floor_Main", (0.0, -0.5, -0.15), (9.2, 16.8, 0.30), col_shell, bevel=0.0, mat=mat_kota)
for zy in (-4.4, -0.6, 3.6, 7.65):
    add_box(f"Floor_BronzeInlay_{zy}", (0.0, zy, 0.002), (8.4, 0.022, 0.004), col_live, bevel=0.0, mat=mat_bronze)

add_box("Wall_Back", (0.0, -8.6, 2.2), (9.2, 0.36, 4.6), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Wall_West_S", (-4.38, -6.4, 2.2), (0.36, 4.6, 4.6), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Wall_West_MidPier", (-4.38, -2.5, 2.2), (0.36, 3.4, 4.6), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Wall_West_AlcoveBack", (-4.82, 1.7, 2.2), (0.36, 5.4, 4.6), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Wall_West_N", (-4.38, 6.0, 2.2), (0.36, 3.8, 4.6), col_shell, bevel=0.0, mat=mat_plaster)

# East Wall with Entry Clerestory Louver Colonnade (Y = -7.6 to -4.6)
add_box("Wall_East_EntryLow", (4.38, -6.1, 0.36), (0.36, 3.4, 0.72), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Wall_East_EntryHigh", (4.38, -6.1, 3.82), (0.36, 3.4, 0.96), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Wall_East_EntryS", (4.38, -8.2, 2.2), (0.36, 1.2, 4.6), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Wall_East_Mid", (4.38, 1.6, 2.2), (0.36, 12.6, 4.6), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Ext_East_SunWall", (6.8, -6.1, 2.2), (0.30, 6.5, 5.2), col_courtyard, bevel=0.0, mat=mat_plaster)
add_box("Ext_East_Floor", (5.6, -6.1, -0.18), (2.6, 6.5, 0.30), col_courtyard, bevel=0.0, mat=mat_trav)

# Continuous 60mm Dark Basalt Shadow-Gap Skirting
add_box("Skirt_West_S", (-4.21, -4.6, 0.03), (0.04, 8.2, 0.06), col_shell, bevel=0.0, mat=mat_basalt)
add_box("Skirt_West_N", (-4.21, 6.0, 0.03), (0.04, 3.6, 0.06), col_shell, bevel=0.0, mat=mat_basalt)
add_box("Skirt_East_Mid", (4.21, 1.6, 0.03), (0.04, 12.4, 0.06), col_shell, bevel=0.0, mat=mat_basalt)

# Coffered Ceiling + Skylight Shaft over Zone 04
add_box("Ceiling_Main", (0.0, -2.1, 4.35), (9.2, 13.2, 0.30), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Ceiling_NorthRim", (0.0, 7.45, 4.35), (9.2, 1.1, 0.30), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Ceiling_SkyW", (-3.15, 5.7, 4.35), (3.0, 2.8, 0.30), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Ceiling_SkyE", (3.15, 5.7, 4.35), (3.0, 2.8, 0.30), col_shell, bevel=0.0, mat=mat_plaster)

add_box("Soffit_West", (-3.72, -1.6, 3.92), (0.98, 13.8, 0.42), col_shell, bevel=0.005, mat=mat_plaster)
add_box("Soffit_East", (3.72, -1.6, 3.92), (0.98, 13.8, 0.42), col_shell, bevel=0.005, mat=mat_plaster)
add_box("CoveLED_West", (-3.26, -1.6, 4.14), (0.05, 13.0, 0.02), col_shell, bevel=0.0, mat=mat_cove)
add_box("CoveLED_East", (3.26, -1.6, 4.14), (0.05, 13.0, 0.02), col_shell, bevel=0.0, mat=mat_cove)

for by in (-4.4, -0.6, 3.6):
    add_box(f"Ceiling_Beam_{by}", (0.0, by, 3.95), (8.4, 0.38, 0.50), col_shell, bevel=0.005, mat=mat_plaster)

for i in range(18):
    sy = -7.6 + i * 0.62
    if abs(sy - (-4.4)) < 0.25 or abs(sy - (-0.6)) < 0.25:
        continue
    add_box(f"Ceiling_Baffle_{i:02d}", (0.0, sy, 4.10), (4.6, 0.055, 0.16), col_joinery, bevel=0.003, mat=mat_sal)

add_box("Skylight_RimS", (0.0, 4.35, 4.78), (3.45, 0.18, 1.05), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Skylight_RimN", (0.0, 7.05, 4.78), (3.45, 0.18, 1.05), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Skylight_RimW", (-1.68, 5.70, 4.78), (0.18, 2.85, 1.05), col_shell, bevel=0.0, mat=mat_plaster)
add_box("Skylight_RimE", (1.68, 5.70, 4.78), (0.18, 2.85, 1.05), col_shell, bevel=0.0, mat=mat_plaster)
for i in range(6):
    sy = 4.65 + i * 0.42
    add_box(f"Skylight_Louver_{i:02d}", (0.0, sy, 4.46), (3.18, 0.048, 0.28), col_joinery, bevel=0.003, mat=mat_sal, rot_deg=(24, 0, 0))

# ==============================================================================
# 3. ZONE 01: ENTRY HALL (Bench shifted neatly left so it NEVER clips foreground!)
# ==============================================================================
for i in range(10):
    ly = -7.50 + i * 0.31
    add_box(f"Entry_Louver_{i:02d}", (4.24, ly, 2.04), (0.28, 0.048, 2.66), col_joinery, bevel=0.003, mat=mat_sal, rot_deg=(0, 0, -28))

add_box("Entry_Bench_Top", (-3.15, -5.85, 0.44), (0.68, 2.15, 0.10), col_monoliths, bevel=0.008, mat=mat_trav)
add_box("Entry_Bench_Leg1", (-3.15, -6.55, 0.20), (0.56, 0.22, 0.39), col_monoliths, bevel=0.006, mat=mat_trav)
add_box("Entry_Bench_Leg2", (-3.15, -5.15, 0.20), (0.56, 0.22, 0.39), col_monoliths, bevel=0.006, mat=mat_trav)
add_box("Entry_Bench_Cushion", (-3.15, -5.65, 0.53), (0.60, 1.35, 0.08), col_monoliths, bevel=0.024, segs=3, mat=mat_linen)

# Framed Architectural Bas-Relief Plaster Art above Entry Bench
add_box("Art1_Frame", (-4.18, -5.85, 1.98), (0.04, 1.72, 2.12), col_live, bevel=0.003, mat=mat_bronze)
add_box("Art1_Canvas", (-4.16, -5.85, 1.98), (0.025, 1.64, 2.04), col_monoliths, bevel=0.0, mat=mat_ceramic)
add_box("Art1_ReliefA", (-4.13, -6.15, 2.15), (0.032, 0.52, 1.15), col_monoliths, bevel=0.005, mat=mat_plaster)
add_box("Art1_ReliefB", (-4.13, -5.48, 1.72), (0.032, 0.62, 0.92), col_monoliths, bevel=0.005, mat=mat_trav)

# REAL Poly Haven CC0 Botanical Potted Plant in Entry Hall!
import_polyhaven_prop("potted_plant_04", "PH_Entry_Plant", (-3.35, -4.05, 0.0), target_height=1.55, rot_z_deg=25)

# ==============================================================================
# 4. ZONE 02 (ST-01): LIMESTONE SANCTUARY (Fluted Sal Wall + Travertine Plinth + Real Lounge Chair)
# ==============================================================================
add_box("ST01_WallBacking", (4.14, -2.50, 1.90), (0.08, 3.60, 3.80), col_joinery, bevel=0.0, mat=mat_sal)
for i in range(34):
    fy = -4.22 + i * 0.104
    add_box(f"ST01_Flute_{i:02d}", (4.06, fy, 1.90), (0.056, 0.054, 3.74), col_joinery, bevel=0.012, segs=2, mat=mat_sal)

add_box("ST01_Plinth_ToeKick", (2.15, -2.50, 0.05), (1.02, 1.92, 0.10), col_live, bevel=0.003, mat=mat_bronze)
add_box("ST01_Plinth_Slab", (2.15, -2.50, 0.34), (1.22, 2.20, 0.48), col_monoliths, bevel=0.008, segs=2, mat=mat_trav)
add_box("ST01_Plinth_Riser", (2.28, -2.02, 0.64), (0.58, 0.72, 0.14), col_monoliths, bevel=0.006, mat=mat_plaster)

# REAL Poly Haven CC0 Studio Props on & beside ST-01 Plinth!
import_polyhaven_prop("brass_vase_01", "PH_ST01_BrassVase", (2.28, -2.02, 0.71), target_height=0.44, rot_z_deg=15)
import_polyhaven_prop("ceramic_vase_01", "PH_ST01_CeramicVase", (2.06, -2.92, 0.58), target_height=0.32, rot_z_deg=-40)
import_polyhaven_prop("mid_century_lounge_chair", "PH_ST01_LoungeChair", (0.30, -3.15, 0.0), target_height=0.84, rot_z_deg=55)

add_cyl("ST01_Side_Stool", (0.18, -2.05, 0.24), 0.22, 0.48, col_monoliths, verts=36, mat=mat_trav, bevel=0.008)

# Framed Plaster Triptych on West Wall Pier
add_box("Art2_Frame", (-4.18, -2.50, 1.92), (0.04, 2.15, 1.55), col_live, bevel=0.003, mat=mat_bronze)
add_box("Art2_Canvas", (-4.16, -2.50, 1.92), (0.025, 2.08, 1.48), col_monoliths, bevel=0.0, mat=mat_ceramic)
for k, ay in enumerate((-3.08, -2.50, -1.92)):
    add_box(f"Art2_Panel_{k}", (-4.13, ay, 1.92), (0.03, 0.48, 1.18), col_monoliths, bevel=0.005, mat=mat_plaster)

# ==============================================================================
# 5. ZONE 03 (ST-02): SAL & MALACHITE PAVILION (Quiet Luxury Deep Verde Alpi Island + Real Stools)
# ==============================================================================
add_box("ST02_Cab_Lower", (-4.24, 1.70, 0.45), (0.80, 4.70, 0.90), col_joinery, bevel=0.004, mat=mat_sal)
add_box("ST02_Cab_Upper", (-4.24, 1.70, 3.08), (0.80, 4.70, 1.46), col_joinery, bevel=0.004, mat=mat_sal)
add_box("ST02_Cab_TowerS", (-4.22, -0.25, 1.90), (0.84, 0.85, 3.80), col_joinery, bevel=0.004, mat=mat_sal)
add_box("ST02_Cab_TowerN", (-4.22, 3.65, 1.90), (0.84, 0.85, 3.80), col_joinery, bevel=0.004, mat=mat_sal)

for i in range(40):
    sy = -0.62 + i * 0.118
    if sy < 0.16 or sy > 3.24:
        add_box(f"ST02_SlatF_{i:02d}", (-3.78, sy, 1.90), (0.04, 0.044, 3.72), col_joinery, bevel=0.005, mat=mat_sal)
    else:
        add_box(f"ST02_SlatU_{i:02d}", (-3.78, sy, 3.08), (0.04, 0.044, 1.40), col_joinery, bevel=0.005, mat=mat_sal)
        add_box(f"ST02_SlatL_{i:02d}", (-3.78, sy, 0.45), (0.04, 0.044, 0.84), col_joinery, bevel=0.005, mat=mat_sal)

add_box("ST02_Backsplash", (-4.60, 1.70, 1.62), (0.08, 3.30, 1.50), col_monoliths, bevel=0.0, mat=mat_trav)
add_box("ST02_Countertop", (-4.24, 1.70, 0.92), (0.84, 3.20, 0.05), col_monoliths, bevel=0.005, mat=mat_malachite)
add_box("ST02_FloatingShelf", (-4.42, 1.70, 1.72), (0.28, 2.90, 0.045), col_monoliths, bevel=0.005, mat=mat_trav)
add_box("ST02_AlcoveLED", (-4.18, 1.70, 2.34), (0.05, 3.05, 0.02), col_shell, bevel=0.0, mat=mat_cove)

import_polyhaven_prop("ceramic_vase_01", "PH_ST02_ShelfVase", (-4.42, 1.15, 1.74), target_height=0.28, rot_z_deg=20)
import_polyhaven_prop("brass_vase_01", "PH_ST02_ShelfBrass", (-4.42, 2.25, 1.74), target_height=0.26, rot_z_deg=-15)

# Monolithic Deep Verde Alpi Malachite Marble Island
add_box("ST02_Island_ToeKick", (-2.05, 1.70, 0.06), (0.98, 2.75, 0.12), col_live, bevel=0.003, mat=mat_bronze)
add_box("ST02_Island_Monolith", (-2.05, 1.70, 0.51), (1.18, 3.10, 0.80), col_monoliths, bevel=0.008, segs=2, mat=mat_malachite)
add_cyl("ST02_Island_Platter", (-2.05, 1.45, 0.935), 0.24, 0.042, col_monoliths, 36, mat_trav, bevel=0.006)
import_polyhaven_prop("brass_vase_01", "PH_ST02_IslandVase", (-2.05, 2.15, 0.91), target_height=0.30, rot_z_deg=70)

# REAL Poly Haven CC0 Designer Round Bar Stools beside Malachite Island!
import_polyhaven_prop("bar_chair_round_01", "PH_ST02_BarStool_0", (-1.05, 1.15, 0.0), target_height=0.68, rot_z_deg=15)
import_polyhaven_prop("bar_chair_round_01", "PH_ST02_BarStool_1", (-1.05, 2.25, 0.0), target_height=0.68, rot_z_deg=-25)

# 3 Brushed Solid Brass Linear Pendant Luminaires
for idx, py in enumerate((0.80, 1.70, 2.60)):
    add_cyl(f"ST02_PendRod_{idx}", (-2.05, py, 3.25), 0.008, 1.90, col_live, 14, mat_bronze, bevel=0)
    add_cyl(f"ST02_PendShade_{idx}", (-2.05, py, 2.22), 0.055, 0.42, col_live, 32, mat_brass, bevel=0.004)
    add_cyl(f"ST02_PendBulb_{idx}", (-2.05, py, 2.00), 0.042, 0.02, col_shell, 24, mat_cove, bevel=0)

# Sculptural Recessed Architectural Stone Relief Wall Panel on East Wall opposite ST-02 (Replaces dead grey TV!)
add_box("EastArt_Frame", (4.16, 1.70, 1.88), (0.05, 2.30, 1.48), col_live, bevel=0.004, mat=mat_bronze)
add_box("EastArt_Backing", (4.14, 1.70, 1.88), (0.03, 2.22, 1.40), col_monoliths, bevel=0.0, mat=mat_trav)
add_box("EastArt_InsetMalachite", (4.11, 1.35, 1.88), (0.025, 0.92, 1.04), col_monoliths, bevel=0.005, mat=mat_malachite)
add_box("EastArt_InsetBrass", (4.10, 2.18, 1.88), (0.028, 0.42, 1.04), col_live, bevel=0.004, mat=mat_brass)

# ==============================================================================
# 6. ZONE 04 (ST-03): COURTYARD THRESHOLD (Twin Fluted Sal Portals + Skylight Monolith)
# ==============================================================================
add_box("ST03_Pier_West", (-3.15, 3.80, 2.05), (2.15, 0.56, 4.10), col_shell, bevel=0.006, mat=mat_plaster)
add_box("ST03_Pier_East", (3.15, 3.80, 2.05), (2.15, 0.56, 4.10), col_shell, bevel=0.006, mat=mat_plaster)
for side, sx, handle_x in (("W", -2.35, -1.86), ("E", 2.35, 1.86)):
    add_box(f"ST03_PortalDoor_{side}", (sx, 4.12, 1.85), (1.12, 0.08, 3.68), col_joinery, bevel=0.004, mat=mat_sal)
    for f in range(10):
        fx = sx - 0.46 + f * 0.102
        add_box(f"ST03_PortalFlute_{side}_{f:02d}", (fx, 4.06, 1.85), (0.044, 0.042, 3.62), col_joinery, bevel=0.008, mat=mat_sal)
    add_cyl(f"ST03_PortalHandle_{side}", (handle_x, 4.00, 1.28), 0.012, 0.92, col_live, 16, mat_brass, bevel=0.003)

add_box("ST03_Monolith_Base", (0.0, 5.70, 0.05), (1.20, 1.20, 0.10), col_live, bevel=0.003, mat=mat_bronze)
add_box("ST03_Monolith_Body", (0.0, 5.70, 0.46), (1.46, 1.46, 0.74), col_monoliths, bevel=0.008, segs=2, mat=mat_trav)
add_box("ST03_Sculp_SlabA", (-0.22, 5.70, 1.16), (0.28, 0.24, 0.66), col_monoliths, bevel=0.006, mat=mat_ceramic)
add_box("ST03_Sculp_SlabB", (0.14, 5.70, 1.06), (0.24, 0.22, 0.46), col_monoliths, bevel=0.006, mat=mat_trav)
add_box("ST03_Sculp_BrassBar", (-0.04, 5.70, 1.32), (0.58, 0.06, 0.05), col_live, bevel=0.004, mat=mat_brass)
import_polyhaven_prop("brass_vase_01", "PH_ST03_BrassVessel", (0.44, 5.45, 0.83), target_height=0.38, rot_z_deg=110)

for side, wx, sign in (("W", -4.05, 1), ("E", 4.05, -1)):
    add_box(f"ST03_SampleLedge_{side}", (wx, 5.70, 1.05), (0.28, 2.20, 0.055), col_monoliths, bevel=0.004, mat=mat_trav)
    add_box(f"ST03_BoardA_{side}", (wx - sign * 0.06, 5.20, 1.42), (0.04, 0.46, 0.68), col_monoliths, bevel=0.004, mat=mat_malachite, rot_deg=(0, sign * 6, 0))
    add_box(f"ST03_BoardB_{side}", (wx - sign * 0.06, 5.72, 1.45), (0.04, 0.46, 0.74), col_joinery, bevel=0.004, mat=mat_sal, rot_deg=(0, sign * 6, 0))
    add_box(f"ST03_BoardC_{side}", (wx - sign * 0.06, 6.24, 1.38), (0.04, 0.46, 0.60), col_monoliths, bevel=0.004, mat=mat_kota, rot_deg=(0, sign * 6, 0))

# ==============================================================================
# 7. ZONE 05: SUNLIT COURTYARD (Deep Wet Basalt Pool Bed + Real Poly Haven Plants + Grounded Fins)
# ==============================================================================
for mx in (-4.15, -2.08, 2.08, 4.15):
    add_box(f"Courtyard_Mullion_{mx}", (mx, 7.75, 2.08), (0.065, 0.11, 4.16), col_live, bevel=0.003, mat=mat_bronze)
add_box("Courtyard_TransomTop", (0.0, 7.75, 4.08), (8.4, 0.11, 0.09), col_live, bevel=0.003, mat=mat_bronze)
add_box("Courtyard_TransomMid", (-3.11, 7.75, 2.95), (2.06, 0.08, 0.05), col_live, bevel=0.002, mat=mat_bronze)
add_box("Courtyard_TransomMidE", (3.11, 7.75, 2.95), (2.06, 0.08, 0.05), col_live, bevel=0.002, mat=mat_bronze)

# Courtyard Terrace slabs flanking a REAL RECESSED WATER BASIN (pool floor 0.25m deep!)
add_box("Courtyard_Terrace_S", (0.0, 8.28, -0.15), (12.4, 1.2, 0.30), col_courtyard, bevel=0.0, mat=mat_trav)
add_box("Courtyard_Terrace_N", (0.0, 13.40, -0.15), (12.4, 2.4, 0.30), col_courtyard, bevel=0.0, mat=mat_trav)
add_box("Courtyard_Terrace_W", (-4.70, 10.55, -0.15), (3.3, 3.6, 0.30), col_courtyard, bevel=0.0, mat=mat_trav)
add_box("Courtyard_Terrace_E", (4.70, 10.55, -0.15), (3.3, 3.6, 0.30), col_courtyard, bevel=0.0, mat=mat_trav)

# Deep Dark Wet Basalt Basin Bed (visible through translucent reflecting water!)
add_box("Courtyard_PoolBed", (0.0, 10.55, -0.24), (6.4, 3.7, 0.12), col_courtyard, bevel=0.0, mat=mat_poolbed)
add_box("Courtyard_PoolRimS", (0.0, 8.85, 0.04), (6.4, 0.26, 0.24), col_courtyard, bevel=0.006, mat=mat_basalt)
add_box("Courtyard_PoolRimN", (0.0, 12.25, 0.04), (6.4, 0.26, 0.24), col_courtyard, bevel=0.006, mat=mat_basalt)
add_box("Courtyard_PoolRimW", (-3.08, 10.55, 0.04), (0.26, 3.65, 0.24), col_courtyard, bevel=0.006, mat=mat_basalt)
add_box("Courtyard_PoolRimE", (3.08, 10.55, 0.04), (0.26, 3.65, 0.24), col_courtyard, bevel=0.006, mat=mat_basalt)

# Translucent Water Surface (replaced in Three.js by dynamic sky-reflecting translucent water shader!)
add_box("Courtyard_WaterPlane", (0.0, 10.55, 0.04), (5.92, 3.16, 0.01), col_live, bevel=0.0, mat=mat_water)

# Grounded Submerged-Base Honed Travertine Stepping Pavers (flat-shaded, crisp, zero black edges!)
for pi, (px, py) in enumerate(((-1.35, 9.85), (0.05, 10.55), (1.45, 11.20))):
    add_box(f"Courtyard_PaverBase_{pi}", (px, py, -0.06), (0.94, 0.62, 0.24), col_courtyard, bevel=0.0, mat=mat_basalt)
    add_box(f"Courtyard_Paver_{pi}", (px, py, 0.095), (1.06, 0.74, 0.075), col_courtyard, bevel=0.006, mat=mat_trav)

# Multi-Layered Sunlit Courtyard Garden Walls + PROPERLY GROUNDED Full-Height Stone Baffle Colonnade!
add_box("Courtyard_BackWall_Low", (0.0, 14.4, 1.15), (12.8, 0.45, 2.60), col_courtyard, bevel=0.0, mat=mat_plaster)
add_box("Courtyard_BackWall_High", (0.0, 14.48, 3.65), (12.8, 0.45, 2.35), col_courtyard, bevel=0.0, mat=mat_plaster)
add_box("Courtyard_ScreenPlinth", (0.0, 13.85, 0.16), (6.4, 0.56, 0.32), col_courtyard, bevel=0.006, mat=mat_trav)
# Grounded vertical travertine architectural fins seated firmly on Courtyard_ScreenPlinth up to the top pergola!
for bi in range(13):
    bx = -2.7 + bi * 0.45
    add_box(f"Courtyard_ScreenFin_{bi:02d}", (bx, 13.85, 2.26), (0.09, 0.34, 3.90), col_courtyard, bevel=0.005, mat=mat_trav)

add_box("Courtyard_SideWall_W", (-5.8, 11.2, 2.4), (0.42, 7.2, 5.2), col_courtyard, bevel=0.0, mat=mat_plaster)
add_box("Courtyard_SideWall_E", (5.8, 11.2, 2.4), (0.42, 7.2, 5.2), col_courtyard, bevel=0.0, mat=mat_plaster)

for pi in range(6):
    py = 8.4 + pi * 0.92
    add_box(f"Courtyard_Pergola_{pi:02d}", (0.0, py, 4.18), (11.6, 0.12, 0.24), col_joinery, bevel=0.004, mat=mat_sal)

# REAL Poly Haven CC0 Botanical Plants in Limestone Courtyard Planters (ZERO cartoon icosphere blobs!)
add_box("Courtyard_Planter_E", (4.15, 11.0, 0.32), (1.50, 1.65, 0.64), col_courtyard, bevel=0.008, mat=mat_trav)
import_polyhaven_prop("potted_plant_01", "PH_Courtyard_Plant_E1", (4.10, 10.90, 0.64), target_height=2.25, rot_z_deg=-35)
import_polyhaven_prop("potted_plant_02", "PH_Courtyard_Plant_E2", (4.35, 11.60, 0.0), target_height=1.35, rot_z_deg=60)

add_box("Courtyard_Planter_W", (-4.15, 11.6, 0.32), (1.50, 1.65, 0.64), col_courtyard, bevel=0.008, mat=mat_trav)
import_polyhaven_prop("potted_plant_04", "PH_Courtyard_Plant_W1", (-4.10, 11.55, 0.64), target_height=2.10, rot_z_deg=45)
import_polyhaven_prop("potted_plant_02", "PH_Courtyard_Plant_W2", (-3.85, 12.60, 0.0), target_height=1.25, rot_z_deg=-20)

# ==============================================================================
# 8. CALIBRATED GOLDEN EASTERN NEPAL MORNING LIGHTING (Zero Whiteout Clipping!)
# ==============================================================================
world = bpy.data.worlds.new("Rubiconius_Morning_World")
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes; wl = world.node_tree.links
bg = next(node for node in wn if node.type == 'BACKGROUND')
sky = wn.new('ShaderNodeTexSky')
try:
    sky.sky_type = 'NISHITA'
except Exception:
    pass
if hasattr(sky, 'sun_elevation'):
    sky.sun_elevation = math.radians(28)
if hasattr(sky, 'sun_rotation'):
    sky.sun_rotation = math.radians(48)
if hasattr(sky, 'sun_intensity'):
    sky.sun_intensity = 0.55
if hasattr(sky, 'air_density'):
    sky.air_density = 1.5
wl.new(sky.outputs['Color'], bg.inputs['Color'])
bg.inputs['Strength'].default_value = 0.45

# Balanced Morning Sun (crisp diagonal stripes without blowing out the floor!)
sun_d = bpy.data.lights.new("Sun_Morning", type='SUN')
sun_d.energy = 2.6
sun_d.color = (1.0, 0.92, 0.79)
sun_d.angle = math.radians(2.2)
sun_o = bpy.data.objects.new("Sun_Morning", sun_d)
link_obj(sun_o, col_lights)
sun_o.location = (8.0, 1.0, 10.0)
sun_o.rotation_euler = (math.radians(52), math.radians(16), math.radians(116))

def add_area(name, loc, rot_deg, energy, color, sx, sy):
    ld = bpy.data.lights.new(name, type='AREA')
    ld.shape = 'RECTANGLE'
    ld.size = sx; ld.size_y = sy
    ld.energy = energy; ld.color = color
    lo = bpy.data.objects.new(name, ld)
    link_obj(lo, col_lights)
    lo.location = Vector(loc)
    lo.rotation_euler = tuple(math.radians(a) for a in rot_deg)
    return lo

# Balanced museum grazing pools (rich midtones & soft shadow penumbras like ICG!)
add_area("L_Entry_LouverGlow", (3.6, -6.1, 2.1), (0, -82, 0), 85, (1.0, 0.92, 0.78), 2.4, 3.0)
add_area("L_ST01_FluteGraze", (3.25, -2.50, 3.65), (0, -24, 0), 105, (1.0, 0.89, 0.72), 0.55, 3.4)
add_area("L_ST01_PlinthSpot", (2.15, -2.50, 3.55), (0, 0, 0), 55, (1.0, 0.93, 0.82), 0.9, 1.8)
add_area("L_ST02_IslandWarm", (-2.05, 1.70, 3.50), (0, 0, 0), 115, (1.0, 0.88, 0.70), 0.9, 3.0)
add_area("L_ST02_AlcoveGlow", (-4.12, 1.70, 2.25), (0, 15, 0), 50, (1.0, 0.87, 0.68), 0.25, 2.8)
add_area("L_ST03_Skylight", (0.0, 5.70, 4.18), (0, 0, 0), 125, (0.98, 0.95, 0.89), 2.8, 2.5)
add_area("L_Courtyard_Wash", (0.0, 10.6, 5.2), (18, 0, 0), 150, (1.0, 0.94, 0.84), 6.0, 4.5)

# ==============================================================================
# 9. JOIN & BAKE 4 SEAMLESS 2048px CYCLES OPTIX ATLASES (ZERO BLACK EDGE BLEED!)
# ==============================================================================
def join_and_bake(col, out_name, res=2048):
    objs = [o for o in col.objects if o.type == 'MESH']
    if not objs:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if len(objs) > 1:
        bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = out_name
    joined.data.name = out_name

    # Generous island_margin=0.018 prevents adjacent UV bleed completely
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=0.018, area_weight=1.0, correct_aspect=True)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Pre-fill bake canvas with warm limestone stone tone (NEVER black!) so mipmaps NEVER bleed dark edges!
    img = bpy.data.images.new(f"T_{out_name}", width=res, height=res, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'sRGB'
    img.generated_color = (0.58, 0.55, 0.50, 1.0)

    temp_nodes = []
    for slot in joined.material_slots:
        if not slot.material or not slot.material.use_nodes:
            continue
        nt = slot.material.node_tree
        tex_node = nt.nodes.new('ShaderNodeTexImage')
        tex_node.image = img
        tex_node.select = True
        nt.nodes.active = tex_node
        temp_nodes.append((nt, tex_node))

    print(f"[Bake] Baking {out_name} ({res}x{res}, {len(joined.data.polygons)} polys)...")
    bpy.ops.object.select_all(action='DESELECT')
    joined.select_set(True)
    bpy.context.view_layer.objects.active = joined

    scene.render.bake.use_pass_direct = True
    scene.render.bake.use_pass_indirect = True
    scene.render.bake.use_pass_diffuse = True
    scene.render.bake.use_pass_glossy = True
    scene.render.bake.use_pass_emit = True
    scene.render.bake.use_clear = False  # Keep our warm stone background instead of clearing to black!
    scene.render.bake.margin = 16
    bpy.ops.object.bake(type='COMBINED')

    img_path = os.path.join(BAKE_DIR, f"T_{out_name}.png")
    img.filepath_raw = img_path
    img.file_format = 'PNG'
    img.save()
    print(f"[Bake] Saved {img_path}")

    for nt, tn in temp_nodes:
        nt.nodes.remove(tn)

    baked_mat = bpy.data.materials.new(f"{out_name}_Mat")
    baked_mat.use_nodes = True
    bnt = baked_mat.node_tree
    bnt.nodes.clear()
    out_n = bnt.nodes.new('ShaderNodeOutputMaterial')
    bg_n = bnt.nodes.new('ShaderNodeBackground')
    img_n = bnt.nodes.new('ShaderNodeTexImage')
    img_n.image = img
    bnt.links.new(img_n.outputs['Color'], bg_n.inputs['Color'])
    bnt.links.new(bg_n.outputs['Background'], out_n.inputs['Surface'])

    joined.data.materials.clear()
    joined.data.materials.append(baked_mat)
    return joined

b_shell = join_and_bake(col_shell, "Set_01_Shell_Baked", res=2048)
b_join = join_and_bake(col_joinery, "Set_02_Joinery_Baked", res=2048)
b_mono = join_and_bake(col_monoliths, "Set_03_Monoliths_Baked", res=2048)
b_court = join_and_bake(col_courtyard, "Set_04_Courtyard_Baked", res=2048)

# ==============================================================================
# 10. AUTHORED 5-STOP ONE-BY-ONE HERO CAMERA RAIL (Desktop + Portrait Clean Framing)
# ==============================================================================
waypoints_blender = [
    ((-0.45, -7.15, 1.56), ( 0.20, -1.60, 1.42)),  # 00 Entry Hall (wide arrival promenade)
    ((-0.85, -3.95, 1.48), ( 2.25, -2.35, 1.02)),  # 01 Limestone Sanctuary (ST-01 plinth + chair + fluted wall centered!)
    (( 0.85,  0.05, 1.52), (-2.15,  1.72, 1.12)),  # 02 Sal & Malachite Pavilion (ST-02 Verde Alpi island + stools + pendants)
    ((-0.20,  2.75, 1.54), ( 0.00,  5.80, 1.18)),  # 03 Courtyard Threshold (ST-03 twin portals + skylight monolith)
    (( 0.15,  6.70, 1.58), ( 0.05, 11.40, 1.32)),  # 04 Sunlit Courtyard (translucent reflecting basin + real botanical planters)
]

hotspots_blender = {
    "Hotspot_FlutedSuite":   ( 2.28, -2.02, 1.28),
    "Hotspot_TimberHearth":  (-2.05,  1.70, 1.18),
    "Hotspot_CourtyardHall": ( 0.00,  5.70, 1.46),
}

cam_objects = []
for idx, (cp, ct) in enumerate(waypoints_blender):
    ep = bpy.data.objects.new(f"CamPoint_{idx:02d}", None)
    ep.location = Vector(cp); link_obj(ep, col_cam); cam_objects.append(ep)
    et = bpy.data.objects.new(f"CamTarget_{idx:02d}", None)
    et.location = Vector(ct); link_obj(et, col_cam); cam_objects.append(et)

hotspot_objs = []
for hname, hpos in hotspots_blender.items():
    he = bpy.data.objects.new(hname, None)
    he.location = Vector(hpos); link_obj(he, col_cam)
    cam_objects.append(he); hotspot_objs.append(he)

bpy.ops.object.select_all(action='DESELECT')
for o in cam_objects:
    o.select_set(True)
cam_out = os.path.join(OUT_DIR, "camera_paths.glb")
bpy.ops.export_scene.gltf(filepath=cam_out, export_format='GLB', use_selection=True, export_yup=True)

bpy.ops.object.select_all(action='DESELECT')
export_objs = (
    [o for o in (b_shell, b_join, b_mono, b_court) if o]
    + list(col_live.objects)
    + list(col_props.objects)
    + hotspot_objs
)
for o in export_objs:
    o.select_set(True)

pov_out = os.path.join(OUT_DIR, "rubiconius_pov.glb")
gltf_kwargs = dict(
    filepath=pov_out,
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_materials='EXPORT',
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_image_format='WEBP',
    export_image_quality=86,
)
try:
    bpy.ops.export_scene.gltf(**gltf_kwargs)
except TypeError:
    gltf_kwargs.pop('export_image_quality', None)
    bpy.ops.export_scene.gltf(**gltf_kwargs)

size_mb = os.path.getsize(pov_out) / (1024 * 1024)
print(f"[Export] Saved {pov_out} ({size_mb:.2f} MB) with {len(list(col_props.objects))} Poly Haven studio props!")
print("DONE!")
