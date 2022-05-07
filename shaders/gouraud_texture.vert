#version 300 es

#define MAX_NUM_LIGHTS 10       // arrays need to have constant sizes for indexing

precision highp float;

in vec3 vertex_position;
in vec3 vertex_normal;
in vec2 vertex_texcoord;

uniform int num_lights;
uniform vec3 light_positions[MAX_NUM_LIGHTS];
uniform vec3 light_colors[MAX_NUM_LIGHTS];
uniform vec3 light_ambient;
uniform vec3 camera_position;
uniform float material_shininess;
uniform vec2 texture_scale;
uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out vec3 ambient;
out vec3 diffuse;
out vec3 specular;
out vec2 frag_texcoord;

float dotPositive(vec3 x, vec3 y) {
    return max(dot(x, y), 0.0);
}

void main() {
    gl_Position = projection_matrix * view_matrix * model_matrix * vec4(vertex_position, 1.0);
    frag_texcoord = vertex_texcoord * texture_scale;

    for (int i = 0; i < num_lights; i++) {
        vec3 world_vertex_normal = normalize(mat3(transpose(inverse(model_matrix))) * vertex_normal);
        vec3 world_vertex_position = (model_matrix * vec4(vertex_position, 1.0)).xyz;

        vec3 N = normalize(world_vertex_normal);                      // normalized surface normal
        vec3 L = normalize(light_positions[i] - world_vertex_position);   // normalized light direction

        vec3 R = normalize(-(reflect(L,N)));          // normalized reflected light direction
        vec3 V = normalize(camera_position - world_vertex_position);  // normalized view direction // i swapped order of subtraction


        ambient += light_ambient;
        diffuse += light_colors[i] * dotPositive(N, L);
        specular += light_colors[i] * pow(dotPositive(R,V), material_shininess);
    }

}
