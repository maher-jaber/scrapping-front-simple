<?php
// Nom du fichier source
$sourceFile = __DIR__ . '/departments_regions_french.json';

// Vérifier si le fichier existe
if (!file_exists($sourceFile)) {
    die("Le fichier $sourceFile est introuvable.\n");
}

// Lire et décoder le JSON
$jsonData = file_get_contents($sourceFile);
$data = json_decode($jsonData, true);

// Vérification de la structure
if (!is_array($data)) {
    die("Erreur : le fichier JSON n'a pas la bonne structure.\n");
}

// Extraction unique des dep_name
$depNames = [];
$regNames = [];

foreach ($data as $item) {
    if (isset($item['dep_name'])) {
        $depNames[] = $item['dep_name'];
    }
    if (isset($item['reg_name'])) {
        $regNames[] = $item['reg_name'];
    }
}

// Suppression des doublons et tri
$depNames = array_values(array_unique($depNames));
$regNames = array_values(array_unique($regNames));

// Sauvegarde dans des fichiers séparés
file_put_contents(__DIR__ . '/dep_names.json', json_encode($depNames, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
file_put_contents(__DIR__ . '/reg_names.json', json_encode($regNames, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo "Fichiers créés : dep_names.json et reg_names.json\n";
