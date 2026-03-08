$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:3001/")
$listener.Start()
Write-Host "Server running at http://localhost:3001/"

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".ico"  = "image/x-icon"
}

$root = "d:\stock"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response

  $urlPath = $request.Url.LocalPath
  if ($urlPath -eq "/") { $urlPath = "/index.html" }

  $filePath = Join-Path $root ($urlPath -replace "/", "\")

  if (Test-Path $filePath -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($filePath)
    $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
    $response.ContentType = $contentType
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $response.StatusCode = 404
    $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
    $response.OutputStream.Write($msg, 0, $msg.Length)
  }

  $response.Close()
  Write-Host "$($request.HttpMethod) $urlPath -> $($response.StatusCode)"
}
