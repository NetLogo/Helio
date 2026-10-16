import java.net.URI;
import java.nio.file.Path;

import org.nlogo.api.AbstractModelLoader;
import org.nlogo.api.AutoConvertable;
import org.nlogo.api.NetLogoLegacyDialect$;
import org.nlogo.core.Model;
import org.nlogo.fileformat.ConversionResult;
import org.nlogo.fileformat.FileFormat;
import org.nlogo.headless.HeadlessWorkspace;
import org.nlogo.sdm.SDMAutoConvertable$;

import scala.collection.immutable.Seq;

/*
 * Java port of the NetLogo Auto-Converter's 7.0.4 step
 * (Auto-Converter/service/src/scala/7.0.4/AutoConverter.scala), so it runs on a
 * stock JDK 17 with the NetLogo 7.0.4 jar and no Scala toolchain.
 * Usage: java -cp netlogo-7.0.4.jar ConvertLegacy.java IN.nlogo OUT.nlogox
 */
public class ConvertLegacy {
  public static void main(String[] args) throws Exception {
    if (args.length != 2) {
      System.err.println("usage: ConvertLegacy IN.nlogo OUT.nlogox");
      System.exit(2);
    }
    URI in = Path.of(args[0]).toAbsolutePath().toUri();
    URI out = Path.of(args[1]).toAbsolutePath().toUri();
    HeadlessWorkspace workspace = HeadlessWorkspace.newInstance();
    try {
      AbstractModelLoader loader =
          FileFormat.standardAnyLoader(false, workspace.compiler().utilities(), false);
      Model legacy = loader.readModel(in).get();
      @SuppressWarnings("unchecked")
      Seq<AutoConvertable> convertables =
          (Seq<AutoConvertable>) FileFormat.defaultAutoConvertables().appended(SDMAutoConvertable$.MODULE$);
      ConversionResult result = FileFormat
          .converter(workspace.getExtensionManager(), workspace.getLibraryManager(),
              workspace.getCompilationEnvironment(), workspace.compiler().utilities(),
              convertables, NetLogoLegacyDialect$.MODULE$)
          .apply(legacy, Path.of(args[0]).toAbsolutePath().getParent());
      if (result.hasErrors()) {
        System.err.println("conversion reported errors");
        System.exit(1);
      }
      loader.save(result.model(), out).get();
      System.out.println(args[1]);
    } finally {
      workspace.dispose();
    }
  }
}
