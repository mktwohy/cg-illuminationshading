#version 300 es

precision mediump float;

in vec3 frag_pos;
in vec3 frag_normal;

uniform vec3 light_ambient;
uniform vec3 light_position;//[10]
uniform vec3 light_color;//[10];
uniform vec3 camera_position;
uniform vec3 material_color;      // Ka and Kd
uniform vec3 material_specular;   // Ks
uniform float material_shininess; // n

out vec4 FragColor;

// dot(x, y), but ensures value is positive. If negative, return 0
float dotPositive(vec3 x, vec3 y) {
    return max(dot(x, y), 0.0);
}

void main() {
    vec3 ambient; // ambient is the same regardless of lights, so it goes outside of loop
    //ambient = light_ambient * material_color;
    vec3 diffuse;
    vec3 specular;
    
    // for (int i = 0; i < 10; i++) {
    //vec3 diffuse; these two change based on each light source so need to update each iteration
    //vec3 specular; these two change based on each light source so need to update each iteration

    vec3 N = normalize(frag_normal);                          // normalized surface normal
    vec3 L = normalize(light_position - frag_pos);         // normalized light direction // i swapped order of subtraction
    //vec3 L = normalize(light_position[i] - frag_pos);         // normalized light direction // i swapped order of subtraction


    vec3 R = normalize(-(reflect(L,N)));          // normalized reflected light direction
    vec3 V = normalize(camera_position - frag_pos);  // normalized view direction // i swapped order of subtraction

    ambient = light_ambient * material_color;
    diffuse = light_color *  material_color * dotPositive(N, L);
    //vec3 diffuse = light_color[i] *  material_color * dotPositive(N, L);
    specular = light_color * material_specular * pow(dotPositive(R,V), material_shininess); // light_color -> light_color[i]
    //vec3 specular = light_color[i] * material_specular * pow(dotPositive(R,V), material_shininess); // light_color -> light_color[i]

    // then we need some extra code for distance of each light and attenuation
    // for distance it is probably something with light_position[i] and then our frag_pos 
    // got this attenuation formula from some glsl docs (att = 1.0 / (1.0 + 0.1*dist + 0.01*dist*dist))
    // not sure if that is what we want. I have also seen some examples that use a clamp() function

    // so attenuation would be
    // float att = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);
    // and distance would probably be
    // float dist = (light_position[i]-frag_pos);



    vec3 result = ambient + diffuse + specular; 
    //vec3 result = result + ambient + diffuse + specular; // probably want to keep adding result, then likely multiply
    // by att

    //} end bracket for loop

    FragColor = vec4(result, 1.0);
}
