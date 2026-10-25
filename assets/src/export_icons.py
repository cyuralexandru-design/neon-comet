import os
os.makedirs('icons',exist_ok=True)
EXP={'consumable_mine':icon(I['k_mine']),'consumable_shield':icon(I['k_shield']),'consumable_magnet':icon(I['k_magnet']),
'consumable_crystals_x2':icon(I['k_x2']),'consumable_repair':icon(I['k_heal']),'pickup_star':icon(I['p_star']),
'pickup_crystal':icon(I['p_crystal']),'pickup_supernova':icon(I['p_capsule']),'weapon_missile_launcher':icon(I['missile']),
'equip_armor':icon(I['e_armor']),'equip_shield_gen':icon(I['e_gen']),'equip_module':icon(I['e_core']),'equip_booster':icon(I['e_boost'])}
for t,n in enumerate(['common','rare','epic','legendary','ultra']): EXP['chest_'+n]=icon(icons2.chest(t),tier=t)
for k,v in EXP.items(): v.save('icons/%s.png'%k)
# preview crop of changed rows
