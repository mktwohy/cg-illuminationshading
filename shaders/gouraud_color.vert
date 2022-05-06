#version 300 es

precision highp float;

in vec3 vertex_position;
in vec3 vertex_normal;

uniform vec3 light_ambient;     // Ia
uniform vec3 light_position;
uniform vec3 light_color;       // Ip
uniform vec3 camera_position;
uniform float material_shininess; // n
uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out vec3 ambient;
out vec3 diffuse;
out vec3 specular;

// dot(x, y), but ensures value is positive. If negative, return 0
float dotPositive(vec3 x, vec3 y) {
    return max(dot(x, y), 0.0);
}

void main() {
    gl_Position = projection_matrix * view_matrix * model_matrix * vec4(vertex_position, 1.0);

    vec3 world_vertex_normal = normalize(mat3(transpose(inverse(model_matrix))) * vertex_normal);
    vec3 world_vertex_position = (model_matrix * vec4(vertex_position, 1.0)).xyz;

    // for (int i = 0; i < 10; i++) {

    vec3 N = normalize(world_vertex_normal);                      // normalized surface normal
    vec3 L = normalize(light_position - world_vertex_position);   // normalized light direction
    //vec3 L = normalize(light_position[i] - world_vertex_position);   // normalized light direction


    vec3 R = normalize(-(reflect(L,N)));          // normalized reflected light direction
    vec3 V = normalize(camera_position - world_vertex_position);  // normalized view direction // i swapped order of subtraction

    // then we need some extra code for distance of each light and attenuation
    // for distance it is probably something with light_position[i] and then our frag_pos 
    // got this attenuation formula from some glsl docs (att = 1.0 / (1.0 + 0.1*dist + 0.01*dist*dist))
    // not sure if that is what we want. I have also seen some examples that use a clamp() function

    // so attenuation would be
    // float att = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
    // and distance would probably be
    // float dist = (light_position[i]-frag_pos);



    ambient = light_ambient;
    diffuse = light_color * dotPositive(N, L);
    // diffuse = diffuse + light_color[i] * dotPositive(N,L) * att; // i think att goes in here
    specular = light_color * pow(dotPositive(R,V), material_shininess);
    //specular = light_color[i] * pow(dotPositive(R,V), material_shininess) * att; // i think att goes in here


    //} end bracket for loop
}

