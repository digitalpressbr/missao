package io.github.digitalpressbr.missao;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.LinearInterpolator;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.File;

/** Tela cheia da chamada: avatar, o que está acontecendo e o botão de iniciar a missão. */
public class ChamadaActivity extends Activity {
    private static final long FECHA_SOZINHA_MS = 3 * 60 * 1000L;
    private final Handler relogio = new Handler(Looper.getMainLooper());
    private final Runnable fechar = this::finish;

    /** Cores do jogo, as mesmas do app. */
    private static final class Tema {
        final int fundo, painel, tinta, apagado, destaque, tintaDestaque, ouro, tintaOuro, linha;
        final boolean claro;

        Tema(boolean rosa) {
            claro = rosa;
            fundo = rosa ? 0xFFFFE4F0 : 0xFF13132E;
            painel = rosa ? 0xFFFFFFFF : 0xFF1D1E46;
            tinta = rosa ? 0xFF47102F : 0xFFF2F3FF;
            apagado = rosa ? 0xFF8B4A6C : 0xFFABAFE0;
            destaque = rosa ? 0xFFC8106E : 0xFF35DFCB;
            tintaDestaque = rosa ? 0xFFFFFFFF : 0xFF06211E;
            ouro = rosa ? 0xFFB45F00 : 0xFFFFB72E;
            tintaOuro = rosa ? 0xFFFFFFFF : 0xFF3B2A00;
            linha = rosa ? 0xFFF2A0C6 : 0xFF3D4085;
        }
    }

    @Override
    protected void onCreate(Bundle guardado) {
        super.onCreate(guardado);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        montar(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        montar(intent);
    }

    @Override
    protected void onDestroy() {
        relogio.removeCallbacks(fechar);
        super.onDestroy();
    }

    private int dp(float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    private void montar(Intent i) {
        Tema t = new Tema("rosa".equals(i.getStringExtra("tema")));
        String titulo = i.getStringExtra("titulo");
        String texto = i.getStringExtra("texto");
        String nome = i.getStringExtra("nome");
        int robux = i.getIntExtra("robux", 0);
        boolean iniciar = i.getBooleanExtra("iniciar", false);

        getWindow().setStatusBarColor(t.fundo);
        getWindow().setNavigationBarColor(t.fundo);
        int marcas = 0;
        if (t.claro) marcas = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(marcas);

        LinearLayout raiz = new LinearLayout(this);
        raiz.setOrientation(LinearLayout.VERTICAL);
        raiz.setBackgroundColor(t.fundo);
        raiz.setPadding(dp(20), dp(24), dp(20), dp(20));

        LinearLayout meio = new LinearLayout(this);
        meio.setOrientation(LinearLayout.VERTICAL);
        meio.setGravity(Gravity.CENTER);

        FrameLayout heroi = new FrameLayout(this);
        heroi.setClipChildren(false);
        heroi.addView(new Raios(this, t.destaque), new FrameLayout.LayoutParams(dp(320), dp(320), Gravity.CENTER));
        heroi.addView(new Avatar(this, t, nome), new FrameLayout.LayoutParams(dp(168), dp(168), Gravity.CENTER));
        meio.addView(heroi, new LinearLayout.LayoutParams(dp(320), dp(300)));

        TextView vTitulo = new TextView(this);
        vTitulo.setText(titulo);
        vTitulo.setTextColor(t.tinta);
        vTitulo.setTextSize(TypedValue.COMPLEX_UNIT_SP, 32);
        vTitulo.setTypeface(Typeface.DEFAULT_BOLD);
        vTitulo.setGravity(Gravity.CENTER);
        meio.addView(vTitulo, linha(0));

        TextView vTexto = new TextView(this);
        vTexto.setText(texto);
        vTexto.setTextColor(t.apagado);
        vTexto.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        vTexto.setGravity(Gravity.CENTER);
        vTexto.setLineSpacing(0, 1.2f);
        meio.addView(vTexto, linha(8));

        if (robux > 0) {
            TextView premio = new TextView(this);
            premio.setText("+" + robux + " Robux");
            premio.setTextColor(t.tintaOuro);
            premio.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
            premio.setTypeface(Typeface.DEFAULT_BOLD);
            premio.setPadding(dp(18), dp(8), dp(18), dp(8));
            premio.setBackground(caixa(t.ouro, 0, 999));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.topMargin = dp(16);
            meio.addView(premio, lp);
        }
        raiz.addView(meio, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        if (iniciar) {
            raiz.addView(botao("Iniciar missão", t.tintaDestaque, caixa(t.destaque, 0, 18), v -> iniciarMissao()), alturaBotao(0));
            raiz.addView(botao("Agora não", t.tinta, caixa(0, t.linha, 18), v -> dispensar()), alturaBotao(10));
        } else {
            raiz.addView(botao("Entendi", t.tintaDestaque, caixa(t.destaque, 0, 18), v -> dispensar()), alturaBotao(0));
        }
        setContentView(raiz);

        relogio.removeCallbacks(fechar);
        relogio.postDelayed(fechar, FECHA_SOZINHA_MS);
    }

    private LinearLayout.LayoutParams linha(int topo) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(topo);
        return lp;
    }

    private LinearLayout.LayoutParams alturaBotao(int topo) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(60));
        lp.topMargin = dp(topo);
        return lp;
    }

    private GradientDrawable caixa(int cor, int borda, float raio) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(cor);
        g.setCornerRadius(dp(raio));
        if (borda != 0) g.setStroke(dp(2), borda);
        return g;
    }

    private TextView botao(String texto, int corTexto, GradientDrawable fundo, View.OnClickListener aoTocar) {
        TextView b = new TextView(this);
        b.setText(texto);
        b.setTextColor(corTexto);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 19);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setGravity(Gravity.CENTER);
        b.setBackground(fundo);
        b.setClickable(true);
        b.setFocusable(true);
        b.setOnClickListener(aoTocar);
        return b;
    }

    private void dispensar() {
        Chamada.apagar(this);
        finish();
    }

    private void iniciarMissao() {
        Chamada.apagar(this);
        Agenda.pedirIniciar(this);
        KeyguardManager trava = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        if (trava != null && trava.isKeyguardLocked()) trava.requestDismissKeyguard(this, null);
        startActivity(new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP));
        finish();
    }

    /** Raios girando atrás do avatar. */
    private static final class Raios extends View {
        private static final int FATIAS = 12;
        private final Paint tinta = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final int cor;
        private final ValueAnimator giro = ValueAnimator.ofFloat(0f, 360f);

        Raios(Context c, int cor) {
            super(c);
            this.cor = cor;
            giro.setDuration(16000);
            giro.setRepeatCount(ValueAnimator.INFINITE);
            giro.setInterpolator(new LinearInterpolator());
            giro.addUpdateListener(a -> {
                setRotation((float) a.getAnimatedValue());
            });
        }

        @Override
        protected void onSizeChanged(int w, int h, int ow, int oh) {
            float raio = Math.min(w, h) / 2f;
            int forte = (cor & 0x00FFFFFF) | 0x66000000;
            int fraco = cor & 0x00FFFFFF;
            tinta.setShader(new RadialGradient(w / 2f, h / 2f, Math.max(1f, raio), new int[] {forte, forte, fraco}, new float[] {0f, 0.45f, 1f}, Shader.TileMode.CLAMP));
        }

        @Override
        protected void onAttachedToWindow() {
            super.onAttachedToWindow();
            giro.start();
        }

        @Override
        protected void onDetachedFromWindow() {
            giro.cancel();
            super.onDetachedFromWindow();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            float w = getWidth(), h = getHeight();
            float passo = 360f / FATIAS;
            for (int i = 0; i < FATIAS; i++) {
                canvas.drawArc(0, 0, w, h, i * passo, passo / 2f, true, tinta);
            }
        }
    }

    /** Avatar do jogador em círculo, com o anel da cor do tema. Sem a imagem, mostra a inicial do nome. */
    private static final class Avatar extends View {
        private final Paint anel = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint miolo = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint letra = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Bitmap imagem;
        private final String inicial;
        private final int corPainel;

        Avatar(Context c, Tema t, String nome) {
            super(c);
            anel.setColor(t.destaque);
            corPainel = t.painel;
            letra.setColor(t.tinta);
            letra.setTypeface(Typeface.DEFAULT_BOLD);
            letra.setTextAlign(Paint.Align.CENTER);
            inicial = nome == null || nome.trim().isEmpty() ? "" : nome.trim().substring(0, 1).toUpperCase();
            File arquivo = new File(c.getFilesDir(), "avatar.jpg");
            imagem = arquivo.exists() ? BitmapFactory.decodeFile(arquivo.getPath()) : null;
        }

        @Override
        protected void onDraw(Canvas canvas) {
            float w = getWidth(), h = getHeight();
            float raio = Math.min(w, h) / 2f;
            float borda = raio * 0.07f;
            canvas.drawCircle(w / 2f, h / 2f, raio, anel);
            if (imagem != null) {
                BitmapShader sombra = new BitmapShader(imagem, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
                float lado = (raio - borda) * 2f;
                float escala = lado / Math.min(imagem.getWidth(), imagem.getHeight());
                Matrix m = new Matrix();
                m.setScale(escala, escala);
                m.postTranslate(w / 2f - imagem.getWidth() * escala / 2f, h / 2f - imagem.getHeight() * escala / 2f);
                sombra.setLocalMatrix(m);
                miolo.setShader(sombra);
            } else {
                miolo.setShader(null);
                miolo.setColor(corPainel);
            }
            canvas.drawCircle(w / 2f, h / 2f, raio - borda, miolo);
            if (imagem == null && !inicial.isEmpty()) {
                letra.setTextSize(raio * 0.9f);
                canvas.drawText(inicial, w / 2f, h / 2f - (letra.descent() + letra.ascent()) / 2f, letra);
            }
        }
    }
}
