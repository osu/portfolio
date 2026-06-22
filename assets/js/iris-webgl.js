/* =================================================================
   WebGL iris aperture for big-bang (desktop; CSS fallback on mobile)
   ================================================================= */
const IRIS_WEBGL = (function () {
  "use strict";

  const DURATION = 22000;

  const VERT = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision mediump float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_center;
    uniform float u_phase;
    const float BLADES = 12.0;

    void main() {
      vec2 uv = (gl_FragCoord.xy - u_center) / min(u_res.x, u_res.y);
      float r = length(uv);
      float a = atan(uv.y, uv.x);

      float open = smoothstep(0.0, 0.24, u_phase) * (1.0 - smoothstep(0.60, 0.80, u_phase));
      float close = 1.0 - open;
      float blade = cos(a * BLADES) * 0.5 + 0.5;
      float aperture = smoothstep(0.10 + close * 0.32, 0.02 + close * 0.30, r + blade * close * 0.16);

      vec3 green = vec3(0.46, 0.73, 0.0);
      vec3 cyan = vec3(0.37, 0.86, 0.95);
      vec3 core = mix(green, cyan, 0.42);
      float glow = exp(-r * 4.8) * (0.45 + open * 0.75);
      float ring = smoothstep(0.36, 0.34, r) * smoothstep(0.28, 0.30, r);

      vec3 col = core * aperture * (0.32 + glow);
      col += vec3(0.92, 1.0, 0.88) * glow * 0.5;
      col += green * ring * 0.38;
      float alpha = clamp(aperture * 0.78 + glow * 0.35 + ring * 0.28, 0.0, 1.0);
      alpha *= smoothstep(1.0, 0.82, u_phase);
      gl_FragColor = vec4(col, alpha * 0.92);
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
    const canvas = document.createElement("canvas");
    canvas.className = "bigbang-iris-canvas";
    canvas.width = Math.floor(size * 2);
    canvas.height = Math.floor(size * 2);
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
    const uTime = gl.getUniformLocation(prog, "u_time");
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
      gl.uniform1f(uTime, elapsed * 0.001);
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
