param([string]$In, [string]$OutDir, [string]$Manifest)
Add-Type -AssemblyName System.Speech
$code = @"
using System; using System.Text; using System.Speech.Synthesis;
public static class Tts {
  public static string Run(string text, string wav) {
    var s = new SpeechSynthesizer();
    s.SelectVoice("Microsoft Maria Desktop");
    s.Rate = 1;
    var sb = new StringBuilder("[");
    bool first = true;
    s.SpeakProgress += (o, e) => {
      lock (sb) {
        sb.Append((first ? "" : ",") + "{\"c\":" + e.CharacterPosition + ",\"n\":" + e.CharacterCount + ",\"t\":" + (int)e.AudioPosition.TotalMilliseconds + "}");
        first = false;
      }
    };
    s.SetOutputToWaveFile(wav);
    s.Speak(text);
    s.SetOutputToNull();
    s.Dispose();
    sb.Append("]");
    return sb.ToString();
  }
}
"@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Speech
$items = Get-Content $In -Raw -Encoding UTF8 | ConvertFrom-Json
$parts = @()
foreach ($it in $items) {
  $wav = Join-Path $OutDir ($it.id + ".wav")
  $words = [Tts]::Run($it.text, $wav)
  $bytes = (Get-Item $wav).Length
  $parts += '"' + $it.id + '":{"bytes":' + $bytes + ',"words":' + $words + '}'
}
$json = "{" + ($parts -join ",") + "}"
[System.IO.File]::WriteAllText($Manifest, $json, (New-Object System.Text.UTF8Encoding($false)))
"ok " + $items.Count
