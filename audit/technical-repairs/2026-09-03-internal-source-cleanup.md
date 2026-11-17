# 2026-09-03 internal source cleanup

The owner requested removal of non-public engineering/template material and backup image copies from the active website repository to prevent future publication-boundary pollution.

Removed from `downloads/`:

- `Begapunk_A4_Horizontal_R2000.dxf`
- `Begapunk_A4_Horizontal_Template.dxf`
- `BP-1P-0003_参数表.xlsx`
- `BP-200-0001-view.pdf`
- `BP-200-0001.pdf`
- `BP-2P-0001_draft.pdf`
- `SJ10-06.pdf`
- `SOLIDWORKS_Template_Guide.md`
- `SOLIDWORKS_Template_Manual.md`

Removed from `images/`:

- `3T-000LYH-3-3.jpg.backup`
- `8-in-8-out-Rotary-joint.png.backup`
- `hero-product-4in4out.png.backup`
- `hero-products-clean.png.backup`
- `hero-products-deublin.png.backup`
- `hero-products-transparent.png.backup`
- `KDN3T-000.jpg.backup`
- `M6_Jun-Bu.jpg.backup`
- `Working-principle-of-rotary-joint.png.backup`

The deleted files remain recoverable from Git history. Historical audit records retain their original paths because they describe the evidence available when those records were created.

The production builder now fails instead of silently excluding any future file under `downloads/` that is absent from the public-download allowlist, or any `.bak` / `.backup` file placed in a public source directory.
