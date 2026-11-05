# NVivo starter kit for the SHGTF study

Files for setting up the NVivo project for *From Heat Warning to School Action* (West Delhi DoE schools).

| File | What it is | How to use it in NVivo |
|---|---|---|
| `SHGTF_codebook.qdc` | 15 parent codes and 68 child codes built from the SHGTF constructs, RQ1–RQ4, vignettes V1–V5 and Sakurai sensei's feedback (pre-season preparedness, escalation, custodial care). Each code has a definition. | **Import > Codebook**, then pick the `.qdc` file. This is the REFI-QDA codebook standard, which NVivo 12 Plus and later can import. |
| `SHGTF_codebook.csv` | The same codebook as a table. | Open it in Excel to print or to discuss with sensei. If the `.qdc` import fails, use it to create the codes by hand. |
| `classification_School.csv` | School attributes: zone, section, shift, heat exposure, neighbourhood, water/shade/ventilation, positive-deviant case. | **Import > Classification Sheets**, classification type *Case*, new classification name `School`. Replace the `EXAMPLE-` rows with your real pseudonymised IDs. |
| `classification_Participant.csv` | Participant attributes: school, role, teacher role type, years, language, timing. | Same as above, classification name `Participant`. The *Role* column is what lets you compare principals with teachers. |
| `Transcript_template.docx` | Transcript layout with Heading 1 for each interview section and vignette. | Copy it for each interview. After import, select the transcripts and choose **Auto Code > code at codes for each Heading 1**. Each vignette answer gets its own code. If NVivo creates duplicates of the codes in `13 Vignette responses`, merge them. |

## Order of setup

1. Create the project (`.nvp` on Windows, `.nvpx` on Mac). Framework Matrices exist only in NVivo for Windows.
2. Import the codebook.
3. Import transcripts into a `Files > Interviews` folder and documents into `Files > Policy documents`.
4. Create one case per participant (the case name must match the `Name` column), then import the classification sheets.
5. Auto-code by heading, then start coding by hand.

Case names in the CSVs must match the case names in NVivo exactly, or the import will add new empty cases.

Menu names move a little between NVivo 14, 15 and the Mac edition. If a command is not where this file says, search for it in NVivo's help.
