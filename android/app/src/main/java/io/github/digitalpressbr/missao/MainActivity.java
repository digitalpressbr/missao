package io.github.digitalpressbr.missao;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/** Casca do app: mostra a Missão do Dia (a mesma página do endereço) e liga a página ao celular. */
public class MainActivity extends Activity {
    static final int VERSAO = 1;
    private static final int PEDIDO_FOTO = 1;
    private static final int PEDIDO_ARQUIVO = 2;
    private static final int PEDIDO_MICROFONE = 3;
    private static final int PEDIDO_AVISOS = 4;
    private static final int TAMANHO_MAXIMO_AVATAR = 3 * 1024 * 1024;
    private static final String SEM_INTERNET = "<!doctype html><html lang=\"pt-BR\"><meta charset=\"utf-8\">"
            + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><body style=\"margin:0;min-height:100vh;display:grid;"
            + "place-items:center;background:#13132E;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px\"><div>"
            + "<h1 style=\"font-size:1.4rem\">Sem internet</h1><p>Conecte o celular e tente de novo.</p>"
            + "<p><a href=\"" + BuildConfig.INICIO + "\" style=\"display:inline-block;background:#35DFCB;color:#06211E;font-weight:700;"
            + "padding:14px 22px;border-radius:14px;text-decoration:none\">Tentar de novo</a></p></div></body></html>";

    private static volatile MainActivity aberta;

    private WebView web;
    private ValueCallback<Uri[]> retornoArquivo;
    private Uri destinoFoto;
    private PermissionRequest pedidoMicrofone;

    static boolean naFrente() {
        return aberta != null;
    }

    /** A chamada chegou com o app aberto: a página mostra a tela cheia dela, com o som. */
    static void chamarNaPagina(String texto) {
        MainActivity a = aberta;
        if (a == null) return;
        String js = "window.dispatchEvent(new CustomEvent('missao-alerta',{detail:{texto:" + JSONObject.quote(texto) + ",aberto:true}}))";
        a.runOnUiThread(() -> a.web.evaluateJavascript(js, null));
    }

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle guardado) {
        super.onCreate(guardado);
        Chamada.criarCanal(this);
        Agenda.programar(this);
        lerPedido(getIntent());

        web = new WebView(this);
        web.setBackgroundColor(0xFF13132E);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false); // o som da chamada toca sem precisar de toque
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " MissaoAndroid/" + VERSAO);
        web.addJavascriptInterface(new Ponte(), "MissaoNativo");
        web.setWebViewClient(new Paginas());
        web.setWebChromeClient(new Recursos());
        web.setDownloadListener((url, agente, disposicao, tipo, tamanho) -> abrirFora(Uri.parse(url)));
        setContentView(web);
        if (guardado == null || web.restoreState(guardado) == null) web.loadUrl(BuildConfig.INICIO);
    }

    @Override
    protected void onSaveInstanceState(Bundle fora) {
        super.onSaveInstanceState(fora);
        web.saveState(fora);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        lerPedido(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        aberta = this;
        web.onResume();
        Chamada.apagar(this);
        avisarPagina();
    }

    @Override
    protected void onPause() {
        aberta = null;
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (aberta == this) aberta = null;
        web.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /** Tocaram no aviso de missão liberada: a página já abre no primeiro passo. */
    private void lerPedido(Intent i) {
        if (i != null && i.getBooleanExtra("iniciar", false)) {
            i.removeExtra("iniciar");
            Agenda.pedirIniciar(this);
        }
    }

    private void avisarPagina() {
        web.evaluateJavascript("window.dispatchEvent(new Event('missao-nativo'))", null);
    }

    private boolean ehDoApp(Uri u) {
        Uri inicio = Uri.parse(BuildConfig.INICIO);
        String caminho = u.getPath() == null ? "" : u.getPath();
        return inicio.getScheme().equals(u.getScheme()) && inicio.getAuthority().equals(u.getAuthority())
                && caminho.startsWith(inicio.getPath()) && !caminho.endsWith(".apk");
    }

    private void abrirFora(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (ActivityNotFoundException e) {
            // sem navegador para abrir: fica na página
        }
    }

    private void abrirAjuste(Intent ajuste) {
        try {
            startActivity(ajuste);
        } catch (RuntimeException e) {
            try {
                startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())));
            } catch (RuntimeException ignorada) {
                // aparelho sem essa tela
            }
        }
    }

    private void aplicarTema(String tema) {
        boolean rosa = "rosa".equals(tema);
        int cor = rosa ? 0xFFFFE4F0 : 0xFF13132E;
        getWindow().setStatusBarColor(cor);
        getWindow().setNavigationBarColor(cor);
        getWindow().getDecorView().setSystemUiVisibility(rosa ? View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0);
    }

    // ---------- o que a página pode pedir ao celular ----------
    private final class Ponte {
        @JavascriptInterface
        public int versao() {
            return VERSAO;
        }

        /** Recebe a agenda das próximas chamadas (JSON) e troca a anterior. Lista vazia desliga tudo. */
        @JavascriptInterface
        public void agendar(String json) {
            Agenda.guardar(MainActivity.this, json);
            String tema = Agenda.dados(MainActivity.this).optString("tema", "");
            if (!tema.isEmpty()) runOnUiThread(() -> aplicarTema(tema));
        }

        /** O que já está liberado neste aparelho. */
        @JavascriptInterface
        public String situacao() {
            JSONObject o = new JSONObject();
            try {
                NotificationManager nm = getSystemService(NotificationManager.class);
                NotificationChannel canal = nm.getNotificationChannel(Chamada.CANAL);
                boolean canalLigado = canal == null || canal.getImportance() != NotificationManager.IMPORTANCE_NONE;
                AlarmManager am = getSystemService(AlarmManager.class);
                PowerManager pm = getSystemService(PowerManager.class);
                o.put("versao", VERSAO);
                o.put("notificacoes", nm.areNotificationsEnabled() && canalLigado);
                o.put("telaCheia", Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent());
                o.put("sobrepor", Settings.canDrawOverlays(MainActivity.this));
                o.put("bateria", pm.isIgnoringBatteryOptimizations(getPackageName()));
                o.put("alarme", Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms());
            } catch (JSONException | RuntimeException e) {
                // devolve o que conseguiu
            }
            return o.toString();
        }

        /** Abre o pedido de permissão ou a tela de ajuste correspondente. */
        @JavascriptInterface
        public void pedir(String qual) {
            runOnUiThread(() -> {
                Uri pacote = Uri.parse("package:" + getPackageName());
                if ("notificacoes".equals(qual)) {
                    boolean falta = Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED;
                    boolean jaPediu = Agenda.guarda(MainActivity.this).getBoolean("pediu_avisos", false);
                    if (falta && (!jaPediu || shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS))) {
                        Agenda.guarda(MainActivity.this).edit().putBoolean("pediu_avisos", true).apply();
                        requestPermissions(new String[] {Manifest.permission.POST_NOTIFICATIONS}, PEDIDO_AVISOS);
                    } else {
                        abrirAjuste(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName()));
                    }
                } else if ("telaCheia".equals(qual) && Build.VERSION.SDK_INT >= 34) {
                    abrirAjuste(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, pacote));
                } else if ("sobrepor".equals(qual)) {
                    abrirAjuste(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, pacote));
                } else if ("bateria".equals(qual)) {
                    abrirAjuste(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pacote));
                } else if ("alarme".equals(qual) && Build.VERSION.SDK_INT >= 31) {
                    abrirAjuste(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, pacote));
                }
            });
        }

        /** Chamada de teste em 10 segundos. */
        @JavascriptInterface
        public void testar() {
            Agenda.testarEm(MainActivity.this, 10000);
        }

        /** "iniciar" quando o jogador tocou em Iniciar missão na chamada; vazio no resto. */
        @JavascriptInterface
        public String pendente() {
            return Agenda.pendente(MainActivity.this);
        }

        /** Guarda o avatar do jogador para a tela da chamada. */
        @JavascriptInterface
        public void guardarAvatar(String base64) {
            if (base64 == null || base64.length() > TAMANHO_MAXIMO_AVATAR) return;
            try (FileOutputStream saida = new FileOutputStream(new File(getFilesDir(), "avatar.jpg"))) {
                saida.write(Base64.decode(base64, Base64.DEFAULT));
            } catch (IOException | IllegalArgumentException e) {
                // sem avatar a chamada mostra a inicial do nome
            }
        }
    }

    // ---------- navegação ----------
    private final class Paginas extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest pedido) {
            if (ehDoApp(pedido.getUrl())) return false;
            abrirFora(pedido.getUrl());
            return true;
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest pedido, WebResourceError erro) {
            if (pedido.isForMainFrame()) view.loadDataWithBaseURL(null, SEM_INTERNET, "text/html", "utf-8", null);
        }
    }

    // ---------- câmera, galeria e microfone ----------
    private final class Recursos extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> retorno, FileChooserParams parametros) {
            if (retornoArquivo != null) retornoArquivo.onReceiveValue(null);
            retornoArquivo = retorno;
            try {
                if (parametros.isCaptureEnabled()) {
                    File pasta = new File(getCacheDir(), "fotos");
                    pasta.mkdirs();
                    File arquivo = new File(pasta, "foto-" + System.currentTimeMillis() + ".jpg");
                    destinoFoto = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".arquivos", arquivo);
                    Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                            .putExtra(MediaStore.EXTRA_OUTPUT, destinoFoto)
                            .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(camera, PEDIDO_FOTO);
                } else {
                    startActivityForResult(parametros.createIntent(), PEDIDO_ARQUIVO);
                }
                return true;
            } catch (RuntimeException e) {
                retornoArquivo = null;
                return false;
            }
        }

        @Override
        public void onPermissionRequest(PermissionRequest pedido) {
            runOnUiThread(() -> {
                boolean querMicrofone = false;
                for (String r : pedido.getResources()) querMicrofone |= PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r);
                if (!querMicrofone) {
                    pedido.deny();
                } else if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    pedido.grant(new String[] {PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                } else {
                    pedidoMicrofone = pedido;
                    requestPermissions(new String[] {Manifest.permission.RECORD_AUDIO}, PEDIDO_MICROFONE);
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent dados) {
        super.onActivityResult(pedido, resultado, dados);
        if (retornoArquivo == null) return;
        Uri[] escolhidos = null;
        if (pedido == PEDIDO_FOTO && resultado == RESULT_OK && destinoFoto != null) escolhidos = new Uri[] {destinoFoto};
        else if (pedido == PEDIDO_ARQUIVO) escolhidos = WebChromeClient.FileChooserParams.parseResult(resultado, dados);
        retornoArquivo.onReceiveValue(escolhidos);
        retornoArquivo = null;
    }

    @Override
    public void onRequestPermissionsResult(int pedido, String[] permissoes, int[] respostas) {
        super.onRequestPermissionsResult(pedido, permissoes, respostas);
        boolean sim = respostas.length > 0 && respostas[0] == PackageManager.PERMISSION_GRANTED;
        if (pedido == PEDIDO_MICROFONE && pedidoMicrofone != null) {
            if (sim) pedidoMicrofone.grant(new String[] {PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else pedidoMicrofone.deny();
            pedidoMicrofone = null;
        } else if (pedido == PEDIDO_AVISOS) {
            avisarPagina();
        }
    }
}
