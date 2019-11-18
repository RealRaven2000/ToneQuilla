set /P toneQuillaRev=<revision.txt
set /a oldRev=%toneQuillaRev%
set /a toneQuillaRev+=1
pwsh -Command "(gc -en UTF8NoBOM install.rdf) -replace 'pre%oldRev%', 'pre%toneQuillaRev%' | Out-File install.rdf"
pwsh -Command "(gc -en UTF8NoBOM manifest.json) -replace 'pre%oldRev%', 'pre%toneQuillaRev%' | Out-File manifest.json"
"C:\Program Files\7-Zip\7z" a -xr!.svn toneQuilla.zip install.rdf chrome.manifest credits.html content defaults locale skin license.txt
echo %toneQuillaRev% > revision.txt
move toneQuilla-*.xpi "..\..\Test Builds\1.2\"
rename toneQuilla.zip ToneQuilla-1.2pre%toneQuillaRev%.xpi