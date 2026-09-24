<?php
/**
 * WORKIZ media receiver for Hostinger shared hosting.
 * Stores files under /media/{folder}/ and returns a public URL.
 *
 * Configure MEDIA_UPLOAD_SECRET in the LMS .env to match $SECRET below
 * (or set via environment if your host supports it).
 */
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Upload-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$SECRET = getenv('MEDIA_UPLOAD_SECRET') ?: 'CHANGE_ME_WORKIZ_MEDIA_SECRET';

$auth = $_SERVER['HTTP_X_UPLOAD_SECRET']
    ?? (isset($_SERVER['HTTP_AUTHORIZATION']) ? preg_replace('/^Bearer\s+/i', '', $_SERVER['HTTP_AUTHORIZATION']) : null)
    ?? ($_POST['secret'] ?? null);

if (!$auth || !hash_equals($SECRET, (string) $auth)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'POST only']);
    exit;
}

$folder = preg_replace('/[^a-z0-9_-]/i', '', (string) ($_POST['folder'] ?? 'misc')) ?: 'misc';
$allowedFolders = ['courses', 'blog', 'lessons', 'videos', 'misc'];
if (!in_array($folder, $allowedFolders, true)) {
    $folder = 'misc';
}

if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'file is required']);
    exit;
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Upload failed', 'code' => $file['error']]);
    exit;
}

$maxBytes = 500 * 1024 * 1024; // 500 MB
if (($file['size'] ?? 0) > $maxBytes) {
    http_response_code(413);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'File too large (max 500MB)']);
    exit;
}

$original = (string) ($file['name'] ?? 'upload.bin');
$ext = strtolower(pathinfo($original, PATHINFO_EXTENSION) ?: 'bin');
$allowedExt = [
    'jpg', 'jpeg', 'png', 'webp', 'gif',
    'mp4', 'webm', 'mov',
    'pdf',
];
if (!in_array($ext, $allowedExt, true)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'File type not allowed']);
    exit;
}

$id = bin2hex(random_bytes(12));
$relativeDir = 'media/' . $folder;
$absoluteDir = __DIR__ . '/' . $relativeDir;
if (!is_dir($absoluteDir) && !mkdir($absoluteDir, 0755, true) && !is_dir($absoluteDir)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Could not create media directory']);
    exit;
}

$filename = $id . '.' . $ext;
$absolutePath = $absoluteDir . '/' . $filename;
if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Could not save file']);
    exit;
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$key = $relativeDir . '/' . $filename;
$publicUrl = $scheme . '://' . $host . '/' . $key;

header('Content-Type: application/json');
echo json_encode([
    'ok' => true,
    'key' => $key,
    'publicUrl' => $publicUrl,
    'byteSize' => (int) $file['size'],
    'contentType' => $file['type'] ?: null,
]);
