# Anatomy models

These GLB files are derived from **BodyParts3D** (PART-OF tree, version 4.0, 99 % reduced OBJ):

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International
> — https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (licence page updated 2025-02-27)

Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. BodyParts3D: 3D structure database
for anatomical concepts. Nucleic Acids Res. 2009;37(Database issue):D782-5. doi:10.1093/nar/gkn613
(PMID 18835852). Dataset DOI: 10.18908/lsdba.nbdc00837-000

The original OBJ file headers state "Creative Commons Attribution-Share Alike 2.1 Japan". To respect
both statements, these derived files are shared under **CC BY-SA 2.1 JP** with the attribution above.
This licence applies to the files in this folder only; the application code is licensed separately.

Changes made: converted from millimetres (Z up) to metres (Y up), re-centred, welded, quantised and
compressed with EXT_meshopt_compression. Geometry was not reshaped. `manifest.json` lists each node with
its BodyParts3D file id, FMA concept id and English name.
