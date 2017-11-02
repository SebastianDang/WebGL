const GL_CANVAS_ID = "#glCanvas" // Change this if you plan to use a different id.
const GL_CONTEXT = "webgl"

const shader_vertex =
    `
  attribute vec3 Vertex;

  uniform mat4 ModelView;
  uniform mat4 Projection;

  void main()
  {
      gl_Position =  Projection * ModelView * vec4(Vertex.x, Vertex.y, Vertex.z, 1.0);
  }
`;

const shader_fragment =
    `
  void main()
  {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;

/**
 * main : Gets the proper canvas id and intializes the glcontext.
 * Starts and handles the WebGL instance.
 */
function main() {
    // Get the canvas from the body.
    const canvas = document.querySelector(GL_CANVAS_ID);

    // Initialize the GL Context.
    const gl = canvas.getContext(GL_CONTEXT);

    // Only continue if WebGL is available and working
    if (!gl) {
        alert("Unable to initialize WebGL.");
        return;
    }

    // Setup the shader program.
    const shaderProgram = initShader(gl, shader_vertex, shader_fragment);
    const shaderProgramInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'Vertex'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'Projection'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'ModelView'),
        },
    };

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    const buffers = initBuffers(gl);

    // Draw the scene
    drawScene(gl, shaderProgramInfo, buffers);
}

/**
 * initShader:: Returns the shader program after loading the vertex & fragment shaders.
 * Returns null if failed.
 */
function initShader(gl, vertex_source, fragment_source) {
    // Load each shader.
    const vertex = loadShader(gl, gl.VERTEX_SHADER, vertex_source);
    const fragment = loadShader(gl, gl.FRAGMENT_SHADER, fragment_source);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertex);
    gl.attachShader(shaderProgram, fragment);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

/**
 * loadShader : Creates a shader for the given type. Uploads and compiles it.
 * Returns the loaded shader.
 * Returns null if failed.
 */
function loadShader(gl, type, source) {
    // Init this shader.
    const shader = gl.createShader(type);

    // Send the source to the shader object.
    gl.shaderSource(shader, source);

    // Compile the shader program.
    gl.compileShader(shader);

    // See if it compiled successfully.
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

/**
 * initBuffers : Create buffer objects for our data.
 * We'll be adding more complexity for larger VAOs and VBOs later.
 */
function initBuffers(gl) {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer operations.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.
    const positions = [
        1.0, 1.0, -1.0, 1.0,
        1.0, -1.0, -1.0, -1.0,
    ];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
    };
}

/**
 * drawScene : Draws the entire scene with shader informaion and buffers.
 *
 */
function drawScene(gl, programInfo, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    const fieldOfView = 45.0 * Math.PI / 180.0; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();

    // Now move the drawing position a bit to where we want to
    // start drawing the square.
    mat4.translate(modelViewMatrix, // destination matrix
        modelViewMatrix, // matrix to translate
        [0.0, 0.0, -6.0]); // amount to translate (z back 6.0)

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 2; // pull out 2 values per iteration
        const type = gl.FLOAT; // the data in the buffer is 32bit floats
        const normalize = false; // don't normalize
        const stride = 0; // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0; // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);

    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}
