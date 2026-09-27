import { useState } from "react";
import { Play, Youtube } from "lucide-react";
import { useVideos, youtubeThumb, type DbVideo } from "@/hooks/useVideos";

const isUpload = (v: DbVideo) => v.source === "upload" && !!v.video_url;

/** Resolve a thumbnail/cover a exibir antes da reprodução */
const coverUrl = (v: DbVideo) => {
  if (isUpload(v)) {
    // thumbnail_url pode ser URL assinada já resolvida ou caminho do bucket
    return v.thumbnail_url || v.playback_url || "";
  }
  return v.youtube_id ? youtubeThumb(v.youtube_id) : "";
};

const VideosSection = () => {
  const { videos, loading } = useVideos(true);
  const [playing, setPlaying] = useState<string | null>(null);

  if (loading || videos.length === 0) return null;

  const main = videos[0];
  const rest = videos.slice(1);

  return (
    <section id="videos" className="container px-4 py-8 space-y-4">
      <div className="flex items-center gap-2">
        <Youtube className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-black text-2xl tracking-wide text-foreground italic">
          VÍDEOS DA MANSÃO
        </h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Novidades, lançamentos e dicas direto do nosso canal.
      </p>

      {/* Vídeo principal */}
      <div className="rounded-2xl overflow-hidden border border-border bg-card">
        <div className="relative aspect-video bg-black">
          {playing === main.id ? (
            isUpload(main) ? (
              <video
                className="absolute inset-0 w-full h-full"
                src={main.playback_url || undefined}
                poster={coverUrl(main) || undefined}
                controls
                autoPlay
                playsInline
                title={main.title}
              />
            ) : (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${main.youtube_id}?autoplay=1&rel=0`}
                title={main.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            )
          ) : (
            <button
              onClick={() => setPlaying(main.id)}
              className="group absolute inset-0 w-full h-full"
              aria-label={`Reproduzir vídeo: ${main.title}`}
            >
              {coverUrl(main) ? (
                <img
                  src={coverUrl(main)}
                  alt={main.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
                  Sem miniatura
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg glow-neon">
                  <Play className="w-7 h-7 ml-1" fill="currentColor" />
                </span>
              </span>
            </button>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-heading font-bold text-foreground">{main.title}</h3>
          {main.description && (
            <p className="text-sm text-muted-foreground mt-1">{main.description}</p>
          )}
        </div>
      </div>

      {/* Demais vídeos */}
      {rest.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
          {rest.map((v) => (
            <button
              key={v.id}
              onClick={() => setPlaying(v.id)}
              className="snap-start shrink-0 w-56 text-left rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-colors"
            >
              <div className="relative aspect-video bg-black">
                {playing === v.id ? (
                  isUpload(v) ? (
                    <video
                      className="absolute inset-0 w-full h-full"
                      src={v.playback_url || undefined}
                      poster={coverUrl(v) || undefined}
                      controls
                      autoPlay
                      playsInline
                      title={v.title}
                    />
                  ) : (
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${v.youtube_id}?autoplay=1&rel=0`}
                      title={v.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  )
                ) : (
                  <>
                    {coverUrl(v) ? (
                      <img
                        src={coverUrl(v)}
                        alt={v.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-[10px]">
                        Sem miniatura
                      </span>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-10 h-10 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center">
                        <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                      </span>
                    </span>
                  </>
                )}
              </div>
              <p className="p-2 text-xs font-heading font-bold text-foreground line-clamp-2">
                {v.title}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default VideosSection;
