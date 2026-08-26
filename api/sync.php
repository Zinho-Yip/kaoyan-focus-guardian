<?php
// Single-user JSON sync endpoint. Set FOCUS_SYNC_TOKEN in the server environment for access control.
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Sync-Token');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
$expected = getenv('FOCUS_SYNC_TOKEN') ?: '';
if ($expected !== '' && !hash_equals($expected, $_SERVER['HTTP_X_SYNC_TOKEN'] ?? '')) { http_response_code(401); echo json_encode(['error'=>'unauthorized']); exit; }
$file = __DIR__ . '/data.json';
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  if (!is_file($file)) { echo json_encode(['data'=>null]); exit; }
  $raw = file_get_contents($file); echo json_encode(['data'=>json_decode($raw, true)]); exit;
}
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
  $payload = json_decode(file_get_contents('php://input'), true);
  if (!is_array($payload) || !isset($payload['updatedAt'])) { http_response_code(400); echo json_encode(['error'=>'invalid_payload']); exit; }
  $written = file_put_contents($file, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
  if ($written === false) { http_response_code(500); echo json_encode(['error'=>'storage_unwritable']); exit; }
  echo json_encode(['data'=>$payload]); exit;
}
http_response_code(405); echo json_encode(['error'=>'method_not_allowed']);
