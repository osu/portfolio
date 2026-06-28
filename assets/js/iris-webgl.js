/* =================================================================
   WebGL camera-iris diaphragm for big-bang (desktop; CSS on mobile)
   ================================================================= */
const IRIS_WEBGL = (function () {
  "use strict";

  const DURATION = 22000;
  const BLADES = 12;

  const VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision mediump float;
    uniform vec2 u_res;
    uniform float u_phase;
    uniform vec2 u_center;
    const float BLADES = ${BLADES}.0;
    const float PI = 3.14159265;

    float diaphragm(vec2 p, float openAmt) {
      float r = length(p);
      float a = atan(p.y, p.x);
      float seg = 2.0 * PI / BLADES;
      float local = abs(mod(a + seg * 0.5, seg) - seg * 0.5);
      float edge = r * cos(local);

      float openR = mix(0.035, 0.36, openAmt);
      float close = 1.0 - openAmt;
      float bladeSwing = close * pow(cos(local * 1.12), 1.6) * 0.38;
      float limit = openR + bladeSwing;

      float outer = 0.46;
      if (r > outer) return 0.0;
      if (edge < openR - 0.018) return 1.0;
      return 1.0 - smoothstep(limit - 0.012, limit + 0.008, edge);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - u_center) / min(u_res.x, u_res.y);
      float r = length(uv);

      float irisPhase = clamp((u_phase - 0.45) / 0.48, 0.0, 1.0);
      float irisReveal = smoothstep(0.45, 0.50, u_phase);
      float irisFade = 1.0 - smoothstep(0.86, 0.98, u_phase);
      float open = smoothstep(0.0, 0.26, irisPhase) * (1.0 - smoothstep(0.58, 0.82, irisPhase));
      float aperture = diaphragm(uv, open);

      vec3 bladeDark = vec3(0.07, 0.10, 0.06);
      vec3 bladeMid = vec3(0.18, 0.28, 0.10);
      vec3 bladeEdge = vec3(0.46, 0.73, 0.0);
      vec3 rim = vec3(0.55, 0.82, 0.12);
      vec3 pupil = vec3(0.02, 0.04, 0.02);

      float seg = 2.0 * PI / BLADES;
      float local = abs(mod(atan(uv.y, uv.x) + seg * 0.5, seg) - seg * 0.5);
      float bladeV = smoothstep(0.0, seg * 0.5, local);
      vec3 bladeCol = mix(bladeEdge, mix(bladeMid, bladeDark, bladeV), 0.55);

      float housing = (1.0 - smoothstep(0.40, 0.44, r)) * smoothstep(0.34, 0.38, r);
      float innerPupil = (1.0 - smoothstep(0.06, 0.14, r)) * (1.0 - open * 0.85);
      float glow = exp(-r * 5.2) * (0.35 + open * 0.65);

      vec3 col = mix(pupil, bladeCol, aperture);
      col = mix(col, rim, housing * 0.55);
      col += bladeEdge * glow * 0.42;
      col += vec3(0.9, 1.0, 0.88) * glow * 0.28 * aperture;

      float alpha = clamp(aperture * 0.88 + housing * 0.35 + glow * 0.3, 0.0, 1.0);
      alpha *= irisReveal * irisFade;
      gl_FragColor = vec4(col, alpha * 0.94);
    }
  `;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
    return sh;
  }

  function mount(overlay, impactX, impactY) {
    if (window.matchMedia("(max-width: 768px)").matches) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

    const size = Math.min(window.innerWidth, window.innerHeight) * 0.76;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const backingSize = Math.min(1792, Math.max(512, Math.floor(size * dpr)));
    const canvas = document.createElement("canvas");
    canvas.className = "bigbang-iris-canvas";
    canvas.width = backingSize;
    canvas.height = backingSize;
    canvas.style.setProperty("--impact-x", impactX.toFixed(2) + "px");
    canvas.style.setProperty("--impact-y", impactY.toFixed(2) + "px");
    overlay.appendChild(canvas);

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) {
      canvas.remove();
      return false;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.remove();
      return false;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.remove();
      return false;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uCenter = gl.getUniformLocation(prog, "u_center");
    const uPhase = gl.getUniformLocation(prog, "u_phase");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const start = performance.now();
    let raf = 0;

    function frame(now) {
      const elapsed = now - start;
      const phase = Math.min(elapsed / DURATION, 1);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uCenter, canvas.width * 0.5, canvas.height * 0.5);
      gl.uniform1f(uPhase, phase);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (phase < 1) raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    window.setTimeout(() => {
      cancelAnimationFrame(raf);
      canvas.remove();
    }, DURATION + 400);

    return true;
  }

  return { mount };
})();
