package br.com.karaokeshow.app;

import android.app.Activity;
import android.webkit.WebView;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;
import org.json.*;

/**
 * Controle familiar na LAN. Não usa nuvem, não disponibiliza arquivos de áudio.
 * Um segredo aleatório por execução protege a página e as ações da fila.
 */
public final class FamilyRemoteServer {
  private final Activity activity;
  private final WebView webView;
  private volatile JSONArray catalog = new JSONArray();
  private volatile ServerSocket server;
  private volatile boolean active;
  private String pairUrl="";
  private final String secret;
  private final Object guard = new Object();
  private int clients = 0;
  private final byte[] remoteHtml;

  public FamilyRemoteServer(Activity activity, WebView webView) throws Exception {
    this.activity=activity;
    this.webView=webView;
    byte[] raw=new byte[16];
    new SecureRandom().nextBytes(raw);
    StringBuilder str=new StringBuilder();
    for(byte b:raw)str.append(String.format(Locale.US,"%02x", b&0xff));
    secret=str.toString();
    try(InputStream in=activity.getAssets().open("family-remote.html")){
      ByteArrayOutputStream buffer=new ByteArrayOutputStream();
      byte[] chunk=new byte[4096];int n;
      while((n=in.read(chunk))!=-1)buffer.write(chunk,0,n);
      remoteHtml=buffer.toByteArray();
    }
  }

  public String getPairUrl(){return pairUrl;}

  public void updateCatalog(String json) {
    if(json==null||json.length()>120000)return;
    try{
      JSONArray arr=new JSONArray(json),safe=new JSONArray();
      int limit=Math.min(arr.length(),350);
      for(int i=0;i<limit;i++){
        JSONObject song=arr.optJSONObject(i);
        if(song==null)continue;
        String id=song.optString("id",""),title=song.optString("title",""),artist=song.optString("artist","");
        if(id.length()>100||id.isEmpty()||title.isEmpty()||title.length()>120||artist.length()>120)continue;
        safe.put(new JSONObject().put("id",id).put("title",title).put("artist",artist));
      }
      catalog=safe;
    }catch(Exception ignored){}
  }

  public void start(){
    try {
      String lanIp=findLanIp();
      if(lanIp==null)return;
      server=new ServerSocket(0,8,InetAddress.getByName(lanIp));
      active=true;
      pairUrl="http://"+lanIp+":"+server.getLocalPort()+"/?key="+secret;
      Thread acceptor=new Thread(()->{
        while(active){
          try{
            final Socket socket=server.accept();
            synchronized(guard) { if(clients>=4){socket.close();continue;} clients++; }
            Thread worker=new Thread(()->{
              try{handle(socket);}
              catch(Exception ignored){}
              finally{
                try{socket.close();}catch(Exception ignored){}
                synchronized(guard){clients--;}
              }
            },"KaraokeRemoteClient");
            worker.setDaemon(true);worker.start();
          }catch(IOException e){if(active)continue;break;}
        }
      },"KaraokeFamilyRemote");
      acceptor.setDaemon(true);acceptor.start();
    }catch(Exception e){active=false;pairUrl="";}
  }

  private static String findLanIp() throws Exception{
    String alternative=null;
    Enumeration<NetworkInterface> all=NetworkInterface.getNetworkInterfaces();
    while(all!=null&&all.hasMoreElements()){
      NetworkInterface iface=all.nextElement();
      if(!iface.isUp()||iface.isLoopback())continue;
      Enumeration<InetAddress> addresses=iface.getInetAddresses();
      while(addresses.hasMoreElements()){
        InetAddress ip=addresses.nextElement();
        if(!(ip instanceof Inet4Address)||!ip.isSiteLocalAddress())continue;
        String name=iface.getName().toLowerCase(Locale.ROOT);
        if(name.startsWith("wlan")||name.startsWith("eth"))return ip.getHostAddress();
        if(alternative==null&&!(name.startsWith("rmnet")||name.startsWith("tun")||name.startsWith("v4")))alternative=ip.getHostAddress();
      }
    }
    return alternative;
  }

  private static String readLine(InputStream in,int max) throws IOException{
    ByteArrayOutputStream line=new ByteArrayOutputStream();
    int c;
    while((c=in.read())!=-1){
      if(c=='\n')break;
      if(c!='\r')line.write(c);
      if(line.size()>max)throw new IOException("HTTP header too large");
    }
    if(c==-1&&line.size()==0)return null;
    return line.toString("US-ASCII");
  }

  private void handle(Socket socket) throws Exception {
    socket.setSoTimeout(4500);
    InputStream in=new BufferedInputStream(socket.getInputStream());
    OutputStream out=new BufferedOutputStream(socket.getOutputStream());
    String line=readLine(in,2048);
    if(line==null)return;
    String[] first=line.split(" ",3);
    if(first.length<2){respond(out,400,"text/plain","Requisição inválida");return;}
    String method=first[0],target=first[1];
    if(target.length()>1500||(!method.equals("GET")&&!method.equals("POST"))){
      respond(out,405,"text/plain","Método não permitido");return;
    }
    int length=0;
    int headerCount=0;
    while(true){
      String header=readLine(in,2048);
      if(header==null||header.isEmpty())break;
      if(++headerCount>30){respond(out,400,"text/plain","Cabeçalhos inválidos");return;}
      int sep=header.indexOf(':');
      if(sep<0)continue;
      if(header.substring(0,sep).equalsIgnoreCase("Content-Length")){
        try{length=Integer.parseInt(header.substring(sep+1).trim());}
        catch(Exception e){length=-1;}
      }
    }
    if(length<0||length>2048){respond(out,413,"text/plain","Corpo muito grande");return;}
    URI uri=new URI("http://local"+target);
    String route=uri.getPath(),query=uri.getRawQuery();
    String key=null;
    if(query!=null){
      for(String p:query.split("&")){
        String[] pair=p.split("=",2);
        if(pair.length==2&&pair[0].equals("key"))key=pair[1];
      }
    }
    if(key==null||!secret.equals(key)){
      respond(out,403,"text/plain","Link de pareamento inválido. Consulte a TV.");return;
    }
    if(route.equals("/")&&method.equals("GET")){
      respond(out,200,"text/html; charset=utf-8",remoteHtml);return;
    }
    if(route.equals("/api/catalog")&&method.equals("GET")){
      JSONObject result=new JSONObject().put("songs",catalog);
      respond(out,200,"application/json; charset=utf-8",result.toString());return;
    }
    if(route.equals("/api/queue")&&method.equals("POST")){
      if(length==0){respond(out,400,"text/plain","Dados ausentes");return;}
      byte[] body=new byte[length];int at=0;
      while(at<length){
        int n=in.read(body,at,length-at);
        if(n<0)throw new EOFException();
        at+=n;
      }
      JSONObject input=new JSONObject(new String(body,StandardCharsets.UTF_8));
      String id=input.optString("songId",""),singer=input.optString("singer","").trim();
      if(singer.isEmpty())singer="Convidado";
      if(singer.length()>36||id.length()>100||id.isEmpty()){
        respond(out,400,"text/plain","Dados inválidos");return;
      }
      boolean found=false;
      JSONArray current=catalog;
      for(int i=0;i<current.length();i++){
        if(id.equals(current.optJSONObject(i).optString("id"))){found=true;break;}
      }
      if(!found){respond(out,404,"text/plain","Música não encontrada na TV");return;}
      JSONObject cmd=new JSONObject().put("type","enqueue").put("songId",id).put("singer",singer);
      final String encoded=JSONObject.quote(cmd.toString());
      activity.runOnUiThread(()->webView.evaluateJavascript(
        "window.dispatchEvent(new CustomEvent('karaoke-remote-command',{detail:JSON.parse("+encoded+")}));",null));
      respond(out,200,"application/json; charset=utf-8","{\"ok\":true}");return;
    }
    respond(out,404,"text/plain","Página não encontrada");
  }

  private static void respond(OutputStream out,int status,String type,String body) throws IOException{
    respond(out,status,type,body.getBytes(StandardCharsets.UTF_8));
  }
  private static void respond(OutputStream out,int status,String type,byte[] body) throws IOException{
    String label=status==200?"OK":status==403?"Forbidden":status==404?"Not Found":status==413?"Payload Too Large":"Bad Request";
    String head="HTTP/1.1 "+status+" "+label+"\r\n"
       +"Content-Type: "+type+"\r\n"
       +"Content-Length: "+body.length+"\r\n"
       +"Cache-Control: no-store, max-age=0\r\n"
       +"Referrer-Policy: no-referrer\r\n"
       +"X-Content-Type-Options: nosniff\r\n"
       +"X-Frame-Options: DENY\r\n"
       +"Content-Security-Policy: default-src 'none'; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:\r\n"
       +"Connection: close\r\n\r\n";
    out.write(head.getBytes(StandardCharsets.US_ASCII));
    out.write(body);out.flush();
  }

  public void stop(){
    active=false;pairUrl="";
    try{if(server!=null)server.close();}catch(Exception ignored){}
    server=null;
  }
}
