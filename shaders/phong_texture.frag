#version 300 es

precision mediump float;

#define MAX_NUM_LIGHTS 10       // arrays need to have constant sizes for indexing


in vec3 frag_pos;
in vec3 frag_normal;
in vec2 frag_texcoord;


uniform int num_lights;
uniform vec3 light_positions[MAX_NUM_LIGHTS];
uniform vec3 light_colors[MAX_NUM_LIGHTS];
uniform vec3 light_ambient;
uniform vec3 camera_position;
uniform vec3 material_color;      // Ka and Kd
uniform vec3 material_specular;   // Ks
uniform float material_shininess; // n
uniform sampler2D image;          // use in conjunction with Ka and Kd

out vec4 FragColor;

float dotPositive(vec3 x, vec3 y) {
    return max(dot(x, y), 0.0);
}

void main() {
    vec3 ambient = light_ambient * material_color; // ambient is the same regardless of lights, so it goes outside of loop
    vec3 result = vec3(0.0);
    
    for (int i = 0; i < num_lights; i++) {
        vec3 N = normalize(frag_normal);                    // normalized surface normal
        vec3 L = normalize(light_positions[i] - frag_pos);  // normalized light direction // i swapped order of subtraction

        vec3 R = normalize(-(reflect(L,N)));                // normalized reflected light direction
        vec3 V = normalize(camera_position - frag_pos);     // normalized view direction // i swapped order of subtraction

        vec3 diffuse = light_colors[i] *  material_color * dotPositive(N, L);
        vec3 specular = light_colors[i] * material_specular * pow(dotPositive(R,V), material_shininess); // light_color -> light_color[i]

        float dist = length(light_positions[i]-frag_pos);
        float att = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);// use clamp() here instead. this constrains a value to lie between two further values

        result = result + (ambient + diffuse + specular) * att;
        //vec3 result = result + ambient + diffuse + specular; // probably want to keep adding result, then likely multiply by att
    }

    FragColor = vec4(result, 1.0);
    FragColor = vec4(result, 1.0) * texture(image, frag_texcoord);
}