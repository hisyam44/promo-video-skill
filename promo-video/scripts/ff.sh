#!/usr/bin/env bash
# ffmpeg recipes for promo videos. Run without arguments for the list.
set -euo pipefail

FF=(ffmpeg -hide_banner -loglevel error -nostats -y)
H264=(-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart)

usage() {
  cat <<'EOF'
ff.sh <command> ...

  probe     <in>                                  duration, size, fps, audio? (JSON)
  normalize <in> <out.mp4> [fps=30] [width]       any clip -> constant-fps H.264 (optionally scaled)
  trim      <in> <out.mp4> <start> <end>          cut [start,end] seconds (re-encodes, frame accurate)
  speed     <in> <out.mp4> <factor>               2 = twice as fast, 0.5 = slow motion (drops audio)
  freeze    <in> <out.mp4> <seconds>              hold the last frame for N extra seconds
  thumb     <in> <out.png> [time=1]               grab one frame
  frames    <in> <outdir> [count=6]               evenly spaced frames + contact sheet (to review a clip)
  vertical  <in> <out.mp4> [w=1080] [h=1920]      16:9 -> 9:16 with blurred fill background
  square    <in> <out.mp4> [size=1080]            -> 1:1 with blurred fill background
  music     <video> <audio> <out.mp4> [vol=0.8] [fadeout=2]   replace soundtrack, trimmed + faded to video length
  duck      <video> <music> <out.mp4> [musicVol=0.35]          mix music UNDER the video's existing audio (voiceover)
  gif       <in> <out.gif> [width=960] [fps=15]   palette-optimised GIF
  webm      <in> <out.webm>                       VP9 for the web
  compress  <in> <out.mp4> [crf=23] [maxWidth=1920]   smaller file for social / upload limits
  concat    <out.mp4> <in1> <in2> ...             join clips (re-encodes; sizes are matched to the first)
  tone      <out.m4a> <seconds> [bpm=110]         placeholder synth beat when no music is available
  storefit  <in> <out.mp4> <w> <h> [fps=30]       raw capture -> exact store-preview size (cover-crop, 30 fps,
                                                  silent stereo track if none), e.g. 886 1920 for App Store iPhone
EOF
}

need() { [[ $# -ge $1 ]] || { usage; exit 64; }; }
dur() { ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$1"; }
blur_fill() { # in out w h
  "${FF[@]}" -i "$1" -filter_complex \
    "[0:v]scale=$3:$4:force_original_aspect_ratio=increase,crop=$3:$4,boxblur=30:3,eq=brightness=-0.08[bg];[0:v]scale=$3:$4:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]" \
    -map "[v]" -map 0:a? -c:a aac -b:a 192k "${H264[@]}" "$2"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  probe)
    need 1 "$@"
    ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of json "$1" | node -e '
      const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
      const v = (j.streams || []).find((s) => s.codec_type === "video") || {};
      const [a, b] = String(v.r_frame_rate || "0/1").split("/").map(Number);
      console.log(JSON.stringify({ duration: Number(j.format?.duration) || null, width: v.width ?? null, height: v.height ?? null,
        fps: b ? Math.round((a / b) * 100) / 100 : null, audio: (j.streams || []).some((s) => s.codec_type === "audio") }));' ;;
  normalize)
    need 2 "$@"; fps="${3:-30}"; scale="scale=trunc(iw/2)*2:trunc(ih/2)*2"
    [[ -n "${4:-}" ]] && scale="scale=$4:-2:flags=lanczos"
    "${FF[@]}" -i "$1" -vf "fps=$fps,$scale,format=yuv420p" "${H264[@]}" -c:a aac -b:a 192k "$2" ;;
  trim)
    need 4 "$@"
    "${FF[@]}" -i "$1" -ss "$3" -to "$4" "${H264[@]}" -c:a aac "$2" ;;
  speed)
    need 3 "$@"
    "${FF[@]}" -i "$1" -vf "setpts=PTS/$3,fps=30" -an "${H264[@]}" "$2" ;;
  freeze)
    need 3 "$@"
    "${FF[@]}" -i "$1" -vf "tpad=stop_mode=clone:stop_duration=$3" -an "${H264[@]}" "$2" ;;
  thumb)
    need 2 "$@"
    "${FF[@]}" -ss "${3:-1}" -i "$1" -frames:v 1 "$2" ;;
  frames)
    need 2 "$@"; n="${3:-6}"; mkdir -p "$2"; rm -f "$2"/frame_*.png "$2/contact_sheet.png"
    d=$(dur "$1")
    for i in $(seq 0 $((n - 1))); do
      t=$(awk -v d="$d" -v i="$i" -v n="$n" 'BEGIN{printf "%.2f", d*(i+0.5)/n}')
      ffmpeg -hide_banner -loglevel error -y -ss "$t" -i "$1" -frames:v 1 -vf "scale=640:-2" "$2/frame_$(printf %02d "$i")_${t}s.png"
    done
    cols=3; rows=$(( (n + cols - 1) / cols ))
    ffmpeg -hide_banner -loglevel error -y -pattern_type glob -i "$2/frame_*.png" -vf "tile=${cols}x${rows}:padding=6:color=black" -frames:v 1 "$2/contact_sheet.png"
    echo "$2/contact_sheet.png" ;;
  vertical)
    need 2 "$@"; blur_fill "$1" "$2" "${3:-1080}" "${4:-1920}" ;;
  square)
    need 2 "$@"; s="${3:-1080}"; blur_fill "$1" "$2" "$s" "$s" ;;
  music)
    need 3 "$@"; vol="${4:-0.8}"; fo="${5:-2}"
    d=$(dur "$1"); st=$(awk -v d="$d" -v f="$fo" 'BEGIN{s=d-f; if(s<0)s=0; printf "%.3f", s}')
    "${FF[@]}" -i "$1" -stream_loop -1 -i "$2" -filter_complex \
      "[1:a]atrim=0:$d,asetpts=PTS-STARTPTS,volume=$vol,afade=t=in:d=0.4,afade=t=out:st=$st:d=$fo,loudnorm=I=-16:TP=-1.5:LRA=11[a]" \
      -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$3" ;;
  duck)
    need 3 "$@"; mv="${4:-0.35}"; d=$(dur "$1")
    st=$(awk -v d="$d" 'BEGIN{s=d-2; if(s<0)s=0; printf "%.3f", s}')
    "${FF[@]}" -i "$1" -stream_loop -1 -i "$2" -filter_complex \
      "[0:a]asplit=2[vo1][vo2];[1:a]atrim=0:$d,asetpts=PTS-STARTPTS,volume=$mv,afade=t=out:st=$st:d=2[m];[m][vo1]sidechaincompress=threshold=0.05:ratio=8:release=400[duck];[duck][vo2]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5[a]" \
      -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$3" ;;
  gif)
    need 2 "$@"; w="${3:-960}"; fps="${4:-15}"
    "${FF[@]}" -i "$1" -filter_complex "fps=$fps,scale=$w:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" "$2" ;;
  webm)
    need 2 "$@"
    "${FF[@]}" -i "$1" -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -c:a libopus "$2" ;;
  compress)
    need 2 "$@"; crf="${3:-23}"; mw="${4:-1920}"
    "${FF[@]}" -i "$1" -vf "scale='min($mw,iw)':-2:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf "$crf" -movflags +faststart -c:a aac -b:a 128k "$2" ;;
  concat)
    need 3 "$@"; out="$1"; shift
    wh=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$1"); w=${wh%x*}; h=${wh#*x}
    inputs=(); filt=""; i=0
    for f in "$@"; do
      inputs+=(-i "$f")
      filt+="[$i:v]scale=$w:$h:force_original_aspect_ratio=decrease,pad=$w:$h:(ow-iw)/2:(oh-ih)/2,fps=30,setsar=1,format=yuv420p[v$i];"
      i=$((i + 1))
    done
    for j in $(seq 0 $((i - 1))); do filt+="[v$j]"; done
    filt+="concat=n=$i:v=1:a=0[v]"
    "${FF[@]}" "${inputs[@]}" -filter_complex "$filt" -map "[v]" "${H264[@]}" "$out" ;;
  tone)
    need 2 "$@"; bpm="${3:-110}"
    beat=$(awk -v b="$bpm" 'BEGIN{printf "%.5f", 60/b}')
    # Kick on every beat + soft pad chord. Good enough as a timing placeholder; swap for real music.
    "${FF[@]}" -f lavfi -i "aevalsrc='0.9*sin(2*PI*(50+90*exp(-mod(t,$beat)*30))*t)*exp(-mod(t,$beat)*9)':s=44100:d=$2" \
      -f lavfi -i "aevalsrc='0.08*(sin(2*PI*220*t)+sin(2*PI*277.18*t)+sin(2*PI*329.63*t))*(0.6+0.4*sin(2*PI*t/8))':s=44100:d=$2" \
      -filter_complex "[0:a][1:a]amix=inputs=2:normalize=0,afade=t=in:d=1,afade=t=out:st=$(awk -v d="$2" 'BEGIN{print d-2}'):d=2,loudnorm=I=-18[a]" \
      -map "[a]" -c:a aac -b:a 192k "$1" ;;
  storefit)
    need 4 "$@"; fps="${5:-30}"
    hasA=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1" | /usr/bin/head -n1 || true)
    if [[ -n "$hasA" ]]; then
      "${FF[@]}" -i "$1" -vf "scale=$3:$4:force_original_aspect_ratio=increase,crop=$3:$4,fps=$fps,setsar=1,format=yuv420p" "${H264[@]}" -c:a aac -b:a 256k -ar 44100 -ac 2 "$2"
    else
      "${FF[@]}" -i "$1" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -shortest \
        -vf "scale=$3:$4:force_original_aspect_ratio=increase,crop=$3:$4,fps=$fps,setsar=1,format=yuv420p" "${H264[@]}" -c:a aac -b:a 256k "$2"
    fi ;;
  ""|-h|--help|help) usage ;;
  *) echo "unknown command: $cmd" >&2; usage; exit 64 ;;
esac
