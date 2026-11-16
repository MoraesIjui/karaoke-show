package br.com.karaokeshow.app;
import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import java.util.Arrays;
public class MainActivity extends Activity {
 private WebView webView;
 private PermissionRequest pendingMicrophone;
 private ValueCallback<android.net.Uri[]> pendingFiles;
 private static final int MIC_REQUEST=21,FILE_REQUEST=22;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  webView=new WebView(this);
  webView.setBackgroundColor(0xff0b0b1b);
  setContentView(webView);
  WebSettings settings=webView.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setMediaPlaybackRequiresUserGesture(true);
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  final WebViewAssetLoader loader=new WebViewAssetLoader.Builder()
   .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  webView.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
    return loader.shouldInterceptRequest(request.getUrl());
   }
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    return !"appassets.androidplatform.net".equals(request.getUrl().getHost())
     && !"https".equals(request.getUrl().getScheme());
   }
  });
  webView.setWebChromeClient(new WebChromeClient(){
   @Override public void onPermissionRequest(PermissionRequest request){
    runOnUiThread(()->{
     String origin=request.getOrigin().toString();
     if(!origin.startsWith("https://appassets.androidplatform.net/")){request.deny();return;}
     if(!Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)){request.deny();return;}
     if(Build.VERSION.SDK_INT>=23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){
      pendingMicrophone=request;
      requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},MIC_REQUEST);
     }else request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
    });
   }
   @Override public void onPermissionRequestCanceled(PermissionRequest request){
    if(pendingMicrophone==request)pendingMicrophone=null;
   }
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<android.net.Uri[]> callback,FileChooserParams params){
    if(pendingFiles!=null)pendingFiles.onReceiveValue(null);
    pendingFiles=callback;
    try{startActivityForResult(params.createIntent(),FILE_REQUEST);}
    catch(Exception e){pendingFiles.onReceiveValue(null);pendingFiles=null;return false;}
    return true;
   }
  });
  webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html");
 }
 @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){
  super.onRequestPermissionsResult(code,permissions,results);
  if(code==MIC_REQUEST && pendingMicrophone!=null){
   PermissionRequest p=pendingMicrophone;pendingMicrophone=null;
   if(results.length>0 && results[0]==PackageManager.PERMISSION_GRANTED)
    p.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
   else p.deny();
  }
 }
 @Override protected void onActivityResult(int code,int result,Intent data){
  super.onActivityResult(code,result,data);
  if(code==FILE_REQUEST && pendingFiles!=null){
   pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));pendingFiles=null;
  }
 }
 @Override public void onBackPressed(){
  if(webView!=null)webView.evaluateJavascript("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));",null);
  else super.onBackPressed();
 }
 @Override protected void onDestroy(){
  if(pendingMicrophone!=null){pendingMicrophone.deny();pendingMicrophone=null;}
  if(pendingFiles!=null){pendingFiles.onReceiveValue(null);pendingFiles=null;}
  if(webView!=null)webView.destroy();
  super.onDestroy();
 }
}
